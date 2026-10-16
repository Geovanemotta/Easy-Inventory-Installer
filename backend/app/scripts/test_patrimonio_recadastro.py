#!/usr/bin/env python3
"""
Test Suite: Controle de Patrimônio, Recadastro de Ativos e Aprovação de Máquinas Novas
Validação Automatizada dos Cenários A a I para o Giassi Enterprise Inventory.
"""

import sys
import unittest
from datetime import datetime
import ipaddress

from sqlalchemy import select, and_, or_
from sqlalchemy.orm import Session, selectinload
from fastapi import HTTPException

from app.database import engine
from app.models.company import Company
from app.models.site import Site
from app.models.device import Device
from app.models.device_history import DeviceHistory
from app.models.network_asset import NetworkAsset
from app.models.user import User
from app.models.role import Role
from app.services.inventory_service import is_subnet_88
from app.api.v1.devices import (
    lookup_patrimonio,
    update_device_patrimonio,
    solicitar_recadastro,
    get_approval_context,
    aprovar_cadastro,
    rejeitar_cadastro,
    DevicePatrimonioIn,
    DeviceSolicitarRecadastroIn,
    DeviceAprovarCadastroIn,
    DeviceRejeitarCadastroIn,
    classificar_familia_so,
)


class TestPatrimonioRecadastro(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with Session(engine) as session:
            company = session.scalar(select(Company).limit(1))
            cls.company_id = company.id
            s1 = session.scalar(select(Site).where(Site.code == "01").limit(1))
            cls.site1_id = s1.id if s1 else None
            s2 = session.scalar(select(Site).where(Site.code == "02").limit(1))
            cls.site2_id = s2.id if s2 else None
            
            # Busca ou cria admin e operador
            admin = session.scalar(
                select(User).join(User.roles).where(Role.slug.in_(["admin", "superadmin"])).limit(1)
            )
            cls.admin_user_id = admin.id if admin else None
            
            operator = session.scalar(
                select(User).join(User.roles).where(Role.slug.in_(["operator", "operador_matriz"])).limit(1)
            )
            cls.operator_user_id = operator.id if operator else None

            # Limpa eventuais testes anteriores
            session.query(Device).filter(Device.hostname.like("TEST-%")).delete()
            session.query(NetworkAsset).filter(NetworkAsset.nome.like("TEST-%")).delete()
            session.commit()

    def setUp(self):
        self.session = Session(engine, expire_on_commit=False)
        self.session.query(Device).filter(Device.hostname.like("TEST-%")).delete()
        self.session.query(NetworkAsset).filter(NetworkAsset.nome.like("TEST-%")).delete()
        self.session.commit()
        self.company = self.session.get(Company, self.company_id)
        self.site1 = self.session.get(Site, self.site1_id) if self.site1_id else None
        self.site2 = self.session.get(Site, self.site2_id) if self.site2_id else None
        
        self.admin_user = self.session.scalar(
            select(User).options(selectinload(User.roles)).where(User.id == self.admin_user_id)
        )
        self.operator_user = self.session.scalar(
            select(User).options(selectinload(User.roles)).where(User.id == self.operator_user_id)
        )

    def tearDown(self):
        # Limpa dados criados durante os testes
        self.session.query(Device).filter(Device.hostname.like("TEST-%")).delete()
        self.session.query(NetworkAsset).filter(NetworkAsset.nome.like("TEST-%")).delete()
        self.session.commit()
        self.session.close()

    def test_cenario_a_patrimonio_novo_em_bancada(self):
        """Teste A — Patrimônio novo em bancada 192.168.88.x -> Solicitação -> Aprovação com IP definitivo"""
        # 1. Cria máquina na bancada de formatação
        dev = Device(
            company_id=self.company.id,
            hostname="TEST-NOVA-PC01",
            ip="192.168.88.115",
            mac="aa:bb:cc:dd:ee:01",
            sistema="Windows",
            versao="Microsoft Windows 11 Pro",
            active=True,
        )
        self.session.add(dev)
        self.session.commit()
        self.session.refresh(dev)

        # 2. Verifica se a aplicação identifica a máquina na faixa 192.168.88.0/24
        self.assertTrue(is_subnet_88(dev.ip), "Deve identificar IP na faixa 192.168.88.0/24")

        # 3. Operador consulta patrimônio inexistente
        lookup = lookup_patrimonio(
            patrimonio="999001",
            current_device_id=dev.id,
            current_user=self.operator_user,
        )
        self.assertFalse(lookup["exists"], "Patrimônio deve constar como não existente")

        # 4. Operador solicita recadastro/homologação
        sol_res = solicitar_recadastro(
            device_id=dev.id,
            payload=DeviceSolicitarRecadastroIn(patrimonio="999001"),
            current_user=self.operator_user,
        )
        self.assertEqual(sol_res["status"], "ok")
        self.assertEqual(sol_res["firewall_status"], "pendente")
        self.assertEqual(sol_res["patrimonio"], "pat.999001")

        # 5. Administrador abre contexto de aprovação
        ctx = get_approval_context(device_id=dev.id, current_user=self.admin_user)
        self.assertTrue(ctx["device"]["is_rede_formatacao"])
        self.assertIsNone(ctx["existing_asset"])

        # 6. Administrador conclui cadastro com IP definitivo na Loja 01
        aprov_res = aprovar_cadastro(
            device_id=dev.id,
            payload=DeviceAprovarCadastroIn(
                site_id=self.site1.id,
                ip_definitivo="192.168.11.220",
                observacao_admin="Aprovado bancada TI Loja 01",
            ),
            current_user=self.admin_user,
        )
        self.assertEqual(aprov_res["status"], "ok")
        self.assertEqual(aprov_res["firewall_status"], "confirmado")
        self.assertEqual(aprov_res["ip_definitivo"], "192.168.11.220")
        self.assertEqual(aprov_res["ip"], "192.168.11.220")

        # 7. Verifica persistência no banco
        self.session.refresh(dev)
        self.assertEqual(dev.ip, "192.168.11.220")
        self.assertEqual(dev.ip_definitivo, "192.168.11.220")
        self.assertEqual(dev.firewall_status, "confirmado")

    def test_cenario_b_patrimonio_existente_mesmo_so(self):
        """Teste B — Patrimônio existente, mesmo sistema operacional -> Detecção de recadastro"""
        # 1. Ativo já existente no inventário
        ativo_antigo = Device(
            company_id=self.company.id,
            site_id=self.site1.id,
            hostname="TEST-ANTIGO-PC",
            ip="192.168.11.45",
            mac="aa:bb:cc:dd:ee:10",
            sistema="Windows",
            versao="Microsoft Windows 11 Pro",
            patrimonio="pat.888002",
            active=True,
        )
        self.session.add(ativo_antigo)
        self.session.commit()

        # 2. Nova máquina recém-formatada na bancada com mesmo patrimônio
        nova_maq = Device(
            company_id=self.company.id,
            hostname="TEST-REFORMATADA-PC",
            ip="192.168.88.116",
            mac="aa:bb:cc:dd:ee:10",
            sistema="Windows",
            versao="Microsoft Windows 11 Pro",
            active=True,
        )
        self.session.add(nova_maq)
        self.session.commit()

        # 3. Operador consulta patrimônio
        lookup = lookup_patrimonio(
            patrimonio="888002",
            current_device_id=nova_maq.id,
            current_user=self.operator_user,
        )
        self.assertTrue(lookup["exists"], "Deve detectar patrimônio existente")
        self.assertEqual(lookup["existing_device"]["hostname"], "TEST-ANTIGO-PC")
        self.assertFalse(lookup["comparativo"]["so_divergente"], "Mesmo SO não deve ser divergente")

        # 4. Aprovação vinculando ao ativo existente sem duplicar
        aprov_res = aprovar_cadastro(
            device_id=nova_maq.id,
            payload=DeviceAprovarCadastroIn(
                site_id=self.site1.id,
                ip_definitivo="192.168.11.45",
                vincular_ativo_existente_id=ativo_antigo.id,
                patrimonio="888002",
            ),
            current_user=self.admin_user,
        )
        self.assertEqual(aprov_res["status"], "ok")

        # 5. Verifica que o ativo anterior foi substituído/arquivado e o novo ativo assumiu a identidade física
        self.session.refresh(ativo_antigo)
        self.session.refresh(nova_maq)
        self.assertFalse(ativo_antigo.active, "Ativo anterior deve ser arquivado para evitar duplicidade")
        self.assertTrue(nova_maq.active, "Novo ativo deve estar ativo")
        self.assertEqual(nova_maq.patrimonio, "pat.888002")

    def test_cenario_c_windows_convertido_para_linux(self):
        """Teste C — Windows convertido para Linux -> Alerta de divergência e confirmação obrigatória"""
        # 1. Ativo existente com Windows 11
        ativo_win = Device(
            company_id=self.company.id,
            site_id=self.site1.id,
            hostname="TEST-WIN-PC",
            ip="192.168.11.70",
            mac="11:22:33:44:55:66",
            sistema="Windows",
            versao="Microsoft Windows 11 Pro",
            patrimonio="pat.777003",
            active=True,
        )
        self.session.add(ativo_win)
        self.session.commit()

        # 2. Máquina formatada que agora instalou Linux (Zorin OS)
        maq_linux = Device(
            company_id=self.company.id,
            hostname="TEST-LINUX-PC",
            ip="192.168.88.117",
            mac="11:22:33:44:55:66",
            sistema="zorin",
            versao="18",
            active=True,
        )
        self.session.add(maq_linux)
        self.session.commit()

        # 3. Consulta de patrimônio deve alertar divergência de SO
        lookup = lookup_patrimonio(
            patrimonio="777003",
            current_device_id=maq_linux.id,
            current_user=self.operator_user,
        )
        self.assertTrue(lookup["exists"])
        self.assertTrue(lookup["comparativo"]["so_divergente"], "Deve detectar que Windows != Linux")

        # 4. Se o operador NÃO confirmar a mudança de SO, deve recusar com 400
        with self.assertRaises(HTTPException) as cm:
            solicitar_recadastro(
                device_id=maq_linux.id,
                payload=DeviceSolicitarRecadastroIn(
                    patrimonio="777003",
                    confirmacao_mudanca_so=False,
                ),
                current_user=self.operator_user,
            )
        self.assertEqual(cm.exception.status_code, 400)
        self.assertIn("Divergência de Sistema Operacional", str(cm.exception.detail))

        # 5. Com confirmação explícita do operador, submissão é aceita
        sol_ok = solicitar_recadastro(
            device_id=maq_linux.id,
            payload=DeviceSolicitarRecadastroIn(
                patrimonio="777003",
                confirmacao_mudanca_so=True,
                motivo="Máquina migrada de Windows para Zorin OS 18",
            ),
            current_user=self.operator_user,
        )
        self.assertEqual(sol_ok["status"], "ok")
        self.assertEqual(sol_ok["firewall_status"], "pendente")

        # 6. Histórico preserva o SO anterior
        self.session.refresh(maq_linux)
        self.assertEqual(maq_linux.so_anterior, "Windows Microsoft Windows 11 Pro")

    def test_cenario_d_mudanca_de_mac(self):
        """Teste D — Mudança de MAC mantendo o mesmo patrimônio -> Divergência exibida e atualizada"""
        ativo_existente = Device(
            company_id=self.company.id,
            site_id=self.site1.id,
            hostname="TEST-PLACA-PC",
            ip="192.168.11.226",
            mac="aa:11:bb:22:cc:33",
            sistema="Windows",
            versao="Microsoft Windows 11 Pro",
            patrimonio="pat.666004",
            active=True,
        )
        self.session.add(ativo_existente)
        self.session.commit()

        # Placa-mãe foi trocada, novo MAC
        maq_nova_placa = Device(
            company_id=self.company.id,
            hostname="TEST-PLACA-PC",
            ip="192.168.88.118",
            mac="ff:99:ee:88:dd:77",
            sistema="Windows",
            versao="Microsoft Windows 11 Pro",
            active=True,
        )
        self.session.add(maq_nova_placa)
        self.session.commit()

        lookup = lookup_patrimonio(
            patrimonio="666004",
            current_device_id=maq_nova_placa.id,
            current_user=self.operator_user,
        )
        self.assertTrue(lookup["comparativo"]["mac_divergente"], "Deve acusar divergência de MAC")

        # Aprovação atualiza o ativo
        aprov = aprovar_cadastro(
            device_id=maq_nova_placa.id,
            payload=DeviceAprovarCadastroIn(
                site_id=self.site1.id,
                ip_definitivo="192.168.11.226",
                vincular_ativo_existente_id=ativo_existente.id,
                patrimonio="666004",
            ),
            current_user=self.admin_user,
        )
        self.assertEqual(aprov["status"], "ok")
        self.session.refresh(maq_nova_placa)
        self.assertEqual(maq_nova_placa.mac, "ff:99:ee:88:dd:77")

    def test_cenario_e_conflito_de_ip_definitivo(self):
        """Teste E — Conflito de IP: Backend impede associação inválida ou exige confirmação"""
        # Máquina já ocupando 192.168.11.99
        ocupante = Device(
            company_id=self.company.id,
            site_id=self.site1.id,
            hostname="TEST-OCUPANTE-PC",
            ip="192.168.11.99",
            mac="12:34:56:78:9a:bc",
            active=True,
        )
        # Nova máquina querendo o mesmo IP
        pretendente = Device(
            company_id=self.company.id,
            site_id=self.site1.id,
            hostname="TEST-PRETENDENTE-PC",
            ip="192.168.88.120",
            mac="98:76:54:32:10:fe",
            active=True,
        )
        self.session.add_all([ocupante, pretendente])
        self.session.commit()

        # Sem confirmação, deve retornar erro 409 Conflito
        with self.assertRaises(HTTPException) as cm:
            aprovar_cadastro(
                device_id=pretendente.id,
                payload=DeviceAprovarCadastroIn(
                    site_id=self.site1.id,
                    ip_definitivo="192.168.11.99",
                    confirmar_sobrescrita_ip=False,
                ),
                current_user=self.admin_user,
            )
        self.assertEqual(cm.exception.status_code, 409)
        self.assertIn("Conflito de IP", str(cm.exception.detail))

        # Ocupante permanece intacto
        self.session.refresh(ocupante)
        self.assertEqual(ocupante.ip, "192.168.11.99")

    def test_cenario_f_loja_invalida_ou_nao_identificada(self):
        """Teste F — Loja não identificada: Rejeita ID de loja inexistente"""
        dev = Device(
            company_id=self.company.id,
            hostname="TEST-SEM-LOJA",
            ip="192.168.88.121",
            active=True,
        )
        self.session.add(dev)
        self.session.commit()

        with self.assertRaises(HTTPException) as cm:
            aprovar_cadastro(
                device_id=dev.id,
                payload=DeviceAprovarCadastroIn(
                    site_id=999999,  # Loja inexistente
                    ip_definitivo="192.168.11.50",
                ),
                current_user=self.admin_user,
            )
        self.assertEqual(cm.exception.status_code, 400)
        self.assertIn("Loja selecionada inválida", str(cm.exception.detail))

    def test_cenario_g_nova_licenca_windows_solicitada(self):
        """Teste G — Flag de Nova Licença Windows: Persistida e auditada"""
        dev = Device(
            company_id=self.company.id,
            hostname="TEST-LICENCA-PC",
            ip="192.168.88.122",
            sistema="Windows",
            versao="Microsoft Windows 11 Pro",
            active=True,
        )
        self.session.add(dev)
        self.session.commit()

        # Operador solicita com flag de licença marcada
        sol = solicitar_recadastro(
            device_id=dev.id,
            payload=DeviceSolicitarRecadastroIn(
                patrimonio="555005",
                licenca_windows_solicitada=True,
                motivo="Troca de placa-mãe exigiu nova licença",
            ),
            current_user=self.operator_user,
        )
        self.assertTrue(sol["licenca_windows_solicitada"])

        self.session.refresh(dev)
        self.assertTrue(dev.licenca_windows_solicitada)

        # Admin visualiza no contexto
        ctx = get_approval_context(device_id=dev.id, current_user=self.admin_user)
        self.assertTrue(ctx["device"]["licenca_windows_solicitada"])

        # Admin aprova
        aprovar_cadastro(
            device_id=dev.id,
            payload=DeviceAprovarCadastroIn(
                site_id=self.site1.id,
                ip_definitivo="192.168.11.222",
            ),
            current_user=self.admin_user,
        )

        # Histórico deve registrar o evento
        history_item = self.session.scalar(
            select(DeviceHistory).where(
                DeviceHistory.device_id == dev.id,
                DeviceHistory.campo == "HOMOLOGACAO_CONCLUIDA",
            )
        )
        self.assertIsNotNone(history_item)
        self.assertIn("licença Windows", history_item.valor_novo)

    def test_cenario_h_seguranca_permissoes(self):
        """Teste H — Permissões: Operador não pode aprovar cadastro diretamente"""
        dev = Device(
            company_id=self.company.id,
            hostname="TEST-PERMISSAO-PC",
            ip="192.168.88.123",
            active=True,
        )
        self.session.add(dev)
        self.session.commit()

        # Operador tenta aprovar -> 403 Forbidden
        with self.assertRaises(HTTPException) as cm:
            aprovar_cadastro(
                device_id=dev.id,
                payload=DeviceAprovarCadastroIn(
                    site_id=self.site1.id,
                    ip_definitivo="192.168.11.135",
                ),
                current_user=self.operator_user,
            )
        self.assertEqual(cm.exception.status_code, 403)

    def test_cenario_i_filtro_subrede_88(self):
        """Teste I — Filtro estrito de rede IPv4 /24 para bancada 192.168.88.0/24"""
        # Pertence a 192.168.88.0/24
        self.assertTrue(is_subnet_88("192.168.88.10"))
        self.assertTrue(is_subnet_88("192.168.88.25"))
        self.assertTrue(is_subnet_88("192.168.88.150"))
        self.assertTrue(is_subnet_88("192.168.88.254"))

        # NÃO pertence a 192.168.88.0/24
        self.assertFalse(is_subnet_88("192.168.89.10"))
        self.assertFalse(is_subnet_88("192.168.11.50"))
        self.assertFalse(is_subnet_88("10.0.7.60"))
        self.assertFalse(is_subnet_88("192.168.888.1"))
        self.assertFalse(is_subnet_88(None))
        self.assertFalse(is_subnet_88(""))

    def test_cenario_auditoria_a_patrimonio_importado_com_ip(self):
        """Cenário A — Patrimônio importado em NetworkAsset com IP cadastrado:
        Reconhece o ativo existente, sugere o IP do ativo de rede (e NÃO o IP da bancada),
        e sincroniza o ativo de rede na aprovação sem duplicidade.
        """
        # 1. Cria ativo importado (NetworkAsset) com patrimônio pat.999111
        net_asset = NetworkAsset(
            company_id=self.company.id,
            site_id=self.site1.id,
            tipo="MICRO",
            nome="TEST-L01-TI-999111",
            ip="192.168.11.235",
            mac="10:20:30:40:50:60",
            patrimonio="pat.999111",
            origem="planilha",
        )
        self.session.add(net_asset)
        self.session.commit()
        self.session.refresh(net_asset)

        # 2. Máquina de bancada (IP 192.168.88.25)
        dev = Device(
            company_id=self.company.id,
            hostname="TEST-BANCADA-01",
            ip="192.168.88.25",
            mac="10:20:30:40:50:60",
            sistema="Windows",
            versao="Microsoft Windows 11 Pro",
            active=True,
        )
        self.session.add(dev)
        self.session.commit()
        self.session.refresh(dev)

        # 3. Operador consulta patrimônio 999111
        lookup = lookup_patrimonio(
            patrimonio="999111",
            current_device_id=dev.id,
            current_user=self.operator_user,
        )
        self.assertTrue(lookup["exists"], "Deve encontrar o patrimônio importado")
        self.assertEqual(lookup["tipo_origem"], "network_asset")
        self.assertEqual(lookup["existing_device"]["ip"], "192.168.11.235")
        self.assertEqual(lookup["existing_device"]["hostname"], "TEST-L01-TI-999111")

        # 4. Operador solicita recadastro
        sol = solicitar_recadastro(
            device_id=dev.id,
            payload=DeviceSolicitarRecadastroIn(patrimonio="999111"),
            current_user=self.operator_user,
        )
        self.assertEqual(sol["status"], "ok")

        # 5. Administrador abre contexto de aprovação
        ctx = get_approval_context(device_id=dev.id, current_user=self.admin_user)
        self.assertIsNotNone(ctx["existing_asset"], "Deve identificar o ativo importado como existente")
        self.assertEqual(ctx["existing_asset"]["tipo_origem"], "network_asset")
        self.assertEqual(ctx["existing_asset"]["ip"], "192.168.11.235")
        # Ponto crítico: IP sugerido DEVE ser o IP do NetworkAsset (192.168.11.235), NUNCA o IP da bancada (192.168.88.25)
        self.assertEqual(ctx["network_context"]["ip_anterior_sugerido"], "192.168.11.235")
        self.assertTrue(ctx["network_context"]["ip_confiavel"])

        # 6. Administrador aprova vinculando ao NetworkAsset
        aprov = aprovar_cadastro(
            device_id=dev.id,
            payload=DeviceAprovarCadastroIn(
                site_id=self.site1.id,
                ip_definitivo="192.168.11.235",
                vincular_network_asset_id=net_asset.id,
                patrimonio="999111",
            ),
            current_user=self.admin_user,
        )
        self.assertEqual(aprov["status"], "ok")
        self.assertEqual(aprov["ip_definitivo"], "192.168.11.235")

        # 7. Verifica sincronização do NetworkAsset
        self.session.refresh(net_asset)
        self.assertEqual(net_asset.ip, "192.168.11.235")
        self.assertIn("Homologado e sincronizado", net_asset.observacoes)

        # Limpa NetworkAsset
        self.session.delete(net_asset)
        self.session.commit()

    def test_cenario_auditoria_b_patrimonio_importado_sem_ip(self):
        """Cenário B — Patrimônio importado sem vínculo de rede / IP:
        Reconhece a existência do ativo pelo patrimônio, mas indica que não há IP confiável sugerido.
        """
        net_asset = NetworkAsset(
            company_id=self.company.id,
            site_id=self.site1.id,
            tipo="NOTEBOOK",
            nome="TEST-NOTE-SEM-IP",
            ip=None,
            patrimonio="pat.999222",
            origem="planilha",
        )
        self.session.add(net_asset)
        self.session.commit()
        self.session.refresh(net_asset)

        dev = Device(
            company_id=self.company.id,
            hostname="TEST-BANCADA-02",
            ip="192.168.88.26",
            active=True,
        )
        self.session.add(dev)
        self.session.commit()

        # Operador solicita com patrimônio 999222
        solicitar_recadastro(
            device_id=dev.id,
            payload=DeviceSolicitarRecadastroIn(patrimonio="999222"),
            current_user=self.operator_user,
        )

        ctx = get_approval_context(device_id=dev.id, current_user=self.admin_user)
        self.assertIsNotNone(ctx["existing_asset"], "Não deve ser classificado como equipamento novo")
        self.assertEqual(ctx["network_context"]["ip_anterior_sugerido"], "")
        self.assertFalse(ctx["network_context"]["ip_confiavel"])

        self.session.delete(net_asset)
        self.session.commit()

    def test_cenario_auditoria_c_patrimonio_conflitante(self):
        """Cenário C — Patrimônio com múltiplos registros conflitantes:
        Sistema sinaliza tem_conflito=True e lista as inconsistências sem escolher arbitrariamente.
        """
        # Ativo em Device
        dev1 = Device(
            company_id=self.company.id,
            site_id=self.site1.id,
            hostname="TEST-CONFLITO-DEV",
            ip="192.168.11.101",
            patrimonio="pat.999333",
            active=True,
        )
        # Ativo em NetworkAsset com dados conflitantes
        net_asset = NetworkAsset(
            company_id=self.company.id,
            site_id=self.site2.id,
            tipo="MICRO",
            nome="TEST-CONFLITO-NET",
            ip="192.168.12.102",
            patrimonio="pat.999333",
            origem="planilha",
        )
        # Máquina na bancada
        dev_bench = Device(
            company_id=self.company.id,
            hostname="TEST-BANCADA-CONFLITO",
            ip="192.168.88.27",
            active=True,
        )
        self.session.add_all([dev1, net_asset, dev_bench])
        self.session.commit()

        # Lookup detecta conflito
        lookup = lookup_patrimonio(
            patrimonio="999333",
            current_device_id=dev_bench.id,
            current_user=self.operator_user,
        )
        self.assertTrue(lookup["tem_conflito"], "Deve sinalizar conflito de registros")
        self.assertGreaterEqual(len(lookup["conflitos"]), 2)

        # Contexto de aprovação também sinaliza conflito
        solicitar_recadastro(
            device_id=dev_bench.id,
            payload=DeviceSolicitarRecadastroIn(patrimonio="999333"),
            current_user=self.operator_user,
        )
        ctx = get_approval_context(device_id=dev_bench.id, current_user=self.admin_user)
        self.assertTrue(ctx["tem_conflito"])
        self.assertGreaterEqual(len(ctx["conflitos"]), 2)

        self.session.delete(net_asset)
        self.session.commit()

    def test_cenario_auditoria_d_bloqueio_alteracao_fora_bancada(self):
        """Cenário D — Operador bloqueado de alterar patrimônio já preenchido fora de 192.168.88.0/24:
        Backend retorna 403 Forbidden para tentativa via update_device_patrimonio e solicitar_recadastro.
        """
        # Máquina fora da faixa 88 com patrimônio já preenchido
        dev = Device(
            company_id=self.company.id,
            site_id=self.site1.id,
            hostname="TEST-LOJA-PRODUCAO",
            ip="192.168.11.40",
            patrimonio="pat.123456",
            active=True,
        )
        self.session.add(dev)
        self.session.commit()
        self.session.refresh(dev)

        # 1. Operador tenta alterar via update_device_patrimonio -> 403
        with self.assertRaises(HTTPException) as cm:
            update_device_patrimonio(
                device_id=dev.id,
                payload=DevicePatrimonioIn(patrimonio="999888"),
                current_user=self.operator_user,
            )
        self.assertEqual(cm.exception.status_code, 403)
        self.assertIn("fora da faixa de preparação", str(cm.exception.detail))

        # 2. Operador tenta alterar via solicitar_recadastro -> 403
        with self.assertRaises(HTTPException) as cm2:
            solicitar_recadastro(
                device_id=dev.id,
                payload=DeviceSolicitarRecadastroIn(patrimonio="999888"),
                current_user=self.operator_user,
            )
        self.assertEqual(cm2.exception.status_code, 403)

        # Patrimônio original deve permanecer intacto
        self.session.refresh(dev)
        self.assertEqual(dev.patrimonio, "pat.123456")

        # 3. Administrador PODE alterar mesmo fora da bancada
        admin_res = update_device_patrimonio(
            device_id=dev.id,
            payload=DevicePatrimonioIn(patrimonio="123457"),
            current_user=self.admin_user,
        )
        self.assertEqual(admin_res["status"], "ok")
        self.assertEqual(admin_res["patrimonio"], "pat.123457")

    def test_cenario_auditoria_e_preenchimento_inicial_fora_bancada(self):
        """Cenário E — Preenchimento inicial de patrimônio vazio fora da bancada:
        Quando o patrimônio está vazio, o operador pode preenchê-lo mesmo fora de 192.168.88.0/24.
        """
        dev_vazio = Device(
            company_id=self.company.id,
            site_id=self.site1.id,
            hostname="TEST-MAQ-SEM-PAT",
            ip="192.168.11.41",
            patrimonio=None,
            active=True,
        )
        self.session.add(dev_vazio)
        self.session.commit()
        self.session.refresh(dev_vazio)

        # Operador preenche pela primeira vez -> deve ser aceito
        res = update_device_patrimonio(
            device_id=dev_vazio.id,
            payload=DevicePatrimonioIn(patrimonio="777888"),
            current_user=self.operator_user,
        )
        self.assertEqual(res["status"], "ok")
        self.assertEqual(res["patrimonio"], "pat.777888")

        self.session.refresh(dev_vazio)
        self.assertEqual(dev_vazio.patrimonio, "pat.777888")

    def test_cenario_auditoria_f_recadastro_na_bancada_88(self):
        """Cenário F — Recadastro na faixa de preparação 192.168.88.0/24:
        Na bancada, operador pode atualizar ou corrigir patrimônio livremente.
        """
        dev_bancada = Device(
            company_id=self.company.id,
            hostname="TEST-BANCADA-CORRECAO",
            ip="192.168.88.99",
            patrimonio="pat.555111",
            active=True,
        )
        self.session.add(dev_bancada)
        self.session.commit()
        self.session.refresh(dev_bancada)

        # Operador corrige patrimônio na bancada -> permitido
        res = update_device_patrimonio(
            device_id=dev_bancada.id,
            payload=DevicePatrimonioIn(patrimonio="555222"),
            current_user=self.operator_user,
        )
        self.assertEqual(res["status"], "ok")
        self.assertEqual(res["patrimonio"], "pat.555222")

    def test_cenario_auditoria_h_motivo_rejeicao_persistido(self):
        """Cenário H — Motivo da rejeição:
        Obrigatório (erro 400 se vazio), persiste o motivo no campo observacao_admin e em DeviceHistory.
        """
        dev = Device(
            company_id=self.company.id,
            hostname="TEST-REJEITAR-PC",
            ip="192.168.88.130",
            firewall_status="pendente",
            active=True,
        )
        self.session.add(dev)
        self.session.commit()
        self.session.refresh(dev)

        # 1. Rejeição com motivo vazio -> 400 Bad Request
        with self.assertRaises(HTTPException) as cm:
            rejeitar_cadastro(
                device_id=dev.id,
                payload=DeviceRejeitarCadastroIn(motivo="   "),
                current_user=self.admin_user,
            )
        self.assertEqual(cm.exception.status_code, 400)
        self.assertIn("obrigatório", str(cm.exception.detail))

        # 2. Rejeição com motivo válido
        justificativa = "Patrimônio informado diverge da etiqueta física fixada na carcaça."
        rej_res = rejeitar_cadastro(
            device_id=dev.id,
            payload=DeviceRejeitarCadastroIn(motivo=justificativa),
            current_user=self.admin_user,
        )
        self.assertEqual(rej_res["status"], "ok")
        self.assertEqual(rej_res["firewall_status"], "rejeitado")

        # 3. Verifica persistência em Device
        self.session.refresh(dev)
        self.assertEqual(dev.firewall_status, "rejeitado")
        self.assertIn(justificativa, dev.observacao_admin)

        # 4. Verifica histórico de auditoria
        hist = self.session.scalar(
            select(DeviceHistory).where(
                DeviceHistory.device_id == dev.id,
                DeviceHistory.campo == "RECADASTRO_REJEITADO",
            ).order_by(DeviceHistory.id.desc())
        )
        self.assertIsNotNone(hist)
        self.assertIn("Rejeitado", hist.valor_novo)
        self.assertIn(justificativa, hist.valor_novo)


if __name__ == "__main__":
    unittest.main()
