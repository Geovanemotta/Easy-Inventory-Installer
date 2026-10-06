import argparse
import sys
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.database import engine
from app.models.company import Company
from app.models.permission import Permission
from app.models.role import Role
from app.models.site import Site
from app.models.site_identifier import SiteIdentifier
from app.models.user import User

PERMISSIONS = [
    {"name": "Visualizar usuários", "slug": "users.view", "description": "Permite visualizar usuários."},
    {"name": "Criar usuários", "slug": "users.create", "description": "Permite criar usuários."},
    {"name": "Editar usuários", "slug": "users.update", "description": "Permite editar usuários."},
    {"name": "Excluir usuários", "slug": "users.delete", "description": "Permite excluir usuários."},
    {"name": "Visualizar lojas", "slug": "sites.view", "description": "Permite visualizar lojas."},
    {"name": "Criar lojas", "slug": "sites.create", "description": "Permite criar lojas."},
    {"name": "Editar lojas", "slug": "sites.update", "description": "Permite editar lojas."},
    {"name": "Excluir lojas", "slug": "sites.delete", "description": "Permite excluir lojas."},
    {"name": "Visualizar inventário", "slug": "inventory.view", "description": "Permite visualizar o inventário."},
    {"name": "Gerenciar inventário", "slug": "inventory.manage", "description": "Permite gerenciar o inventário."},
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


def seed_database(
    company_name: str,
    company_slug: str,
    admin_username: str,
    admin_fullname: str,
    admin_email: str,
    admin_password: str,
    create_default_sites: bool = True,
):
    print("=" * 60)
    print(" [*] Iniciando Seed de Configuração Turnkey...")
    print("=" * 60)

    with Session(engine) as session:
        # 1. EMPRESA
        company = session.scalar(select(Company).where(Company.slug == company_slug))
        if company is None:
            company = Company(
                name=company_name,
                slug=company_slug,
                active=True,
            )
            session.add(company)
            session.flush()
            print(f" [+] Empresa criada: {company.name} ({company.slug}) [ID: {company.id}]")
        else:
            company.name = company_name
            company.active = True
            session.flush()
            print(f" [i] Empresa existente atualizada: {company.name} ({company.slug}) [ID: {company.id}]")

        # 2. PERMISSÕES
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
            perm_map[pdata["slug"]] = perm
        print(f" [+] {len(perm_map)} Permissões do sistema garantidas.")

        # 3. PERFIS DE ACESSO (ROLES)
        role_map = {}
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
            for pslug in rdata["permissions"]:
                p_obj = perm_map.get(pslug)
                if p_obj and p_obj not in role.permissions:
                    role.permissions.append(p_obj)
            role_map[rdata["slug"]] = role
        session.flush()
        print(f" [+] {len(role_map)} Perfis (Roles) configurados.")

        # 4. USUÁRIO ADMINISTRADOR
        superadmin_role = role_map["superadmin"]
        user = session.scalar(
            select(User).where(
                User.company_id == company.id,
                User.username == admin_username,
            )
        )

        pwd_hash = hash_password(admin_password)

        if user is None:
            user = User(
                company_id=company.id,
                username=admin_username,
                email=admin_email,
                full_name=admin_fullname,
                password_hash=pwd_hash,
                active=True,
                is_superadmin=True,
            )
            user.roles.append(superadmin_role)
            session.add(user)
            session.flush()
            print(f" [+] Usuário Superadmin criado com sucesso: {admin_username}")
        else:
            user.password_hash = pwd_hash
            user.email = admin_email
            user.full_name = admin_fullname
            user.active = True
            user.is_superadmin = True
            if superadmin_role not in user.roles:
                user.roles.append(superadmin_role)
            session.flush()
            print(f" [i] Usuário Superadmin existente atualizado: {admin_username}")

        # 5. FILIAIS / SITES PADRÃO
        if create_default_sites:
            print(" [*] Criando estrutura padrão de filiais e lojas...")
            sites_to_create = []

            # Lojas 01 a 30
            for i in range(1, 31):
                num_str = f"{i:02d}"
                sites_to_create.append({
                    "name": f"{company_name} Loja {num_str}",
                    "code": num_str,
                    "identifiers": [f"LJ{num_str}", f"L{num_str}", f"LJ{i}", f"L{i}"],
                })

            # Combos 01 a 10
            for i in range(1, 11):
                num_str = f"{i:02d}"
                sites_to_create.append({
                    "name": f"Combo {num_str}",
                    "code": f"C{num_str}",
                    "identifiers": [f"CB{num_str}", f"C{num_str}", f"CB{i}", f"C{i}"],
                })

            # Matriz
            sites_to_create.append({
                "name": f"{company_name} Matriz",
                "code": "MATRIZ",
                "identifiers": ["MATRIZ", "MT", "ADM", "AC"],
            })

            # Outros
            sites_to_create.append({
                "name": "Outros",
                "code": "OUTROS",
                "identifiers": ["OUTROS"],
            })

            sites_added = 0
            for sdata in sites_to_create:
                site = session.scalar(
                    select(Site).where(
                        Site.company_id == company.id,
                        Site.code == sdata["code"],
                    )
                )
                if site is None:
                    site = Site(
                        company_id=company.id,
                        name=sdata["name"],
                        code=sdata["code"],
                        active=True,
                    )
                    session.add(site)
                    session.flush()
                    sites_added += 1

                for ident_str in sdata["identifiers"]:
                    s_ident = session.scalar(
                        select(SiteIdentifier).where(
                            SiteIdentifier.company_id == company.id,
                            SiteIdentifier.identifier == ident_str,
                        )
                    )
                    if s_ident is None:
                        s_ident = SiteIdentifier(
                            company_id=company.id,
                            site_id=site.id,
                            identifier=ident_str,
                            active=True,
                        )
                        session.add(s_ident)

            session.flush()
            print(f" [+] Estrutura de filiais pronta: {len(sites_to_create)} lojas mapeadas ({sites_added} novas).")

        session.commit()
        print("=" * 60)
        print(" [✓] Banco de dados inicializado e configurado com sucesso!")
        print("=" * 60)


def sync_roles_only():
    print("=" * 60)
    print(" [*] Sincronizando papéis (roles) e permissões do sistema...")
    print("=" * 60)
    with Session(engine) as session:
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
            perm_map[pdata["slug"]] = perm
        print(f" [+] {len(perm_map)} Permissões do sistema garantidas.")

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
    print("=" * 60)
    print(" [✓] Papéis e permissões sincronizados com sucesso!")
    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(description="Seed inicial turnkey para instalação limpa.")
    parser.add_argument("--sync-roles", action="store_true", help="Apenas sincronizar papéis e permissões sem alterar dados")
    parser.add_argument("--company-name", default="Giassi Supermercados", help="Nome da empresa")
    parser.add_argument("--company-slug", default="giassi", help="Slug único da empresa")
    parser.add_argument("--admin-username", default="admin", help="Nome de usuário do admin")
    parser.add_argument("--admin-fullname", default="Administrador do Sistema", help="Nome completo do admin")
    parser.add_argument("--admin-email", default="admin@giassi.com.br", help="E-mail do admin")
    parser.add_argument("--admin-password", required=False, help="Senha do admin inicial")
    parser.add_argument("--no-default-sites", action="store_true", help="Não criar lista padrão de lojas/filiais")

    args = parser.parse_args()

    if args.sync_roles:
        sync_roles_only()
        return

    if not args.admin_password:
        parser.error("o parâmetro --admin-password é obrigatório para inicialização completa.")

    seed_database(
        company_name=args.company_name,
        company_slug=args.company_slug,
        admin_username=args.admin_username,
        admin_fullname=args.admin_fullname,
        admin_email=args.admin_email,
        admin_password=args.admin_password,
        create_default_sites=not args.no_default_sites,
    )


if __name__ == "__main__":
    main()
