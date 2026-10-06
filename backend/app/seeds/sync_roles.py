"""
Script para sincronizar papéis (roles) e permissões do sistema sem alterar dados existentes.
Seguro para execução repetida em ambientes de produção e atualizações.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import engine
from app.models import Permission, Role

PERMISSIONS = [
    {"name": "Visualizar Usuários", "slug": "users.view", "description": "Permissão para visualizar usuários"},
    {"name": "Criar Usuários", "slug": "users.create", "description": "Permissão para criar usuários"},
    {"name": "Editar Usuários", "slug": "users.update", "description": "Permissão para atualizar usuários"},
    {"name": "Excluir Usuários", "slug": "users.delete", "description": "Permissão para remover usuários"},
    {"name": "Visualizar Lojas", "slug": "sites.view", "description": "Permissão para visualizar lojas"},
    {"name": "Criar Lojas", "slug": "sites.create", "description": "Permissão para criar lojas"},
    {"name": "Editar Lojas", "slug": "sites.update", "description": "Permissão para atualizar lojas"},
    {"name": "Excluir Lojas", "slug": "sites.delete", "description": "Permissão para remover lojas"},
    {"name": "Visualizar Inventário", "slug": "inventory.view", "description": "Permissão para visualizar inventário"},
    {"name": "Gerenciar Inventário", "slug": "inventory.manage", "description": "Permissão para editar/excluir dados de inventário"},
]

ROLES = [
    {
        "name": "Super Administrador",
        "slug": "superadmin",
        "description": "Acesso administrativo global à empresa e todas as lojas.",
        "permissions": [
            "users.view", "users.create", "users.update", "users.delete",
            "sites.view", "sites.create", "sites.update", "sites.delete",
            "inventory.view", "inventory.manage",
        ],
    },
    {
        "name": "Administrador",
        "slug": "admin",
        "description": "Administração de usuários, lojas e inventário conforme acessos atribuídos.",
        "permissions": [
            "users.view", "users.create", "users.update",
            "sites.view", "sites.create", "sites.update",
            "inventory.view", "inventory.manage",
        ],
    },
    {
        "name": "Operador",
        "slug": "operator",
        "description": "Visualização e operação do inventário de sua respectiva filial.",
        "permissions": [
            "sites.view", "inventory.view", "inventory.manage",
        ],
    },
    {
        "name": "Operador Matriz",
        "slug": "operador_matriz",
        "description": "Visualização do inventário completo, ativos de rede e relatórios com fluxo de homologação no firewall.",
        "permissions": [
            "sites.view", "inventory.view",
        ],
    },
]


def sync_roles():
    print("[*] Sincronizando papéis e permissões do sistema...")
    with Session(engine) as session:
        # 1. Garante permissões
        perm_map = {}
        for pdata in PERMISSIONS:
            perm = session.scalar(select(Permission).where(Permission.slug == pdata["slug"]))
            if perm is None:
                perm = Permission(
                    name=pdata["name"],
                    slug=pdata["slug"],
                    description=pdata["description"],
                    active=True,
                )
                session.add(perm)
                session.flush()
                print(f" [+] Nova permissão criada: {perm.slug}")
            perm_map[pdata["slug"]] = perm

        # 2. Garante papéis e links
        for rdata in ROLES:
            role = session.scalar(select(Role).where(Role.slug == rdata["slug"]))
            if role is None:
                role = Role(
                    name=rdata["name"],
                    slug=rdata["slug"],
                    description=rdata["description"],
                    active=True,
                )
                session.add(role)
                session.flush()
                print(f" [+] Novo papel criado: {role.slug}")
            else:
                role.name = rdata["name"]
                role.description = rdata["description"]
                role.active = True

            for pslug in rdata["permissions"]:
                p_obj = perm_map.get(pslug)
                if p_obj and p_obj not in role.permissions:
                    role.permissions.append(p_obj)
                    print(f" [+] Permissão '{pslug}' vinculada ao papel '{role.slug}'")

        session.commit()
    print("[✓] Papéis e permissões sincronizados com sucesso!")


if __name__ == "__main__":
    sync_roles()
