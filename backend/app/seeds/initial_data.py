import os

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.models import Company, Permission, Role


DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)

PERMISSIONS = [
    {
        "name": "Visualizar usuários",
        "slug": "users.view",
        "description": "Permite visualizar usuários.",
    },
    {
        "name": "Criar usuários",
        "slug": "users.create",
        "description": "Permite criar usuários.",
    },
    {
        "name": "Editar usuários",
        "slug": "users.update",
        "description": "Permite editar usuários.",
    },
    {
        "name": "Excluir usuários",
        "slug": "users.delete",
        "description": "Permite excluir usuários.",
    },
    {
        "name": "Visualizar lojas",
        "slug": "sites.view",
        "description": "Permite visualizar lojas.",
    },
    {
        "name": "Criar lojas",
        "slug": "sites.create",
        "description": "Permite criar lojas.",
    },
    {
        "name": "Editar lojas",
        "slug": "sites.update",
        "description": "Permite editar lojas.",
    },
    {
        "name": "Excluir lojas",
        "slug": "sites.delete",
        "description": "Permite excluir lojas.",
    },
    {
        "name": "Visualizar inventário",
        "slug": "inventory.view",
        "description": "Permite visualizar o inventário.",
    },
    {
        "name": "Gerenciar inventário",
        "slug": "inventory.manage",
        "description": "Permite gerenciar o inventário.",
    },
]


ROLES = [
    {
        "name": "Super Administrador",
        "slug": "superadmin",
        "description": "Acesso administrativo global à empresa.",
        "permissions": [
            "users.view",
            "users.create",
            "users.update",
            "users.delete",
            "sites.view",
            "sites.create",
            "sites.update",
            "sites.delete",
            "inventory.view",
            "inventory.manage",
        ],
    },
    {
        "name": "Administrador",
        "slug": "admin",
        "description": "Administração de usuários, lojas e inventário conforme os acessos atribuídos.",
        "permissions": [
            "users.view",
            "users.create",
            "users.update",
            "sites.view",
            "sites.create",
            "sites.update",
            "inventory.view",
            "inventory.manage",
        ],
    },
    {
        "name": "Operador",
        "slug": "operator",
        "description": "Visualização e operação do inventário.",
        "permissions": [
            "sites.view",
            "inventory.view",
            "inventory.manage",
        ],
    },
    {
        "name": "Operador Matriz",
        "slug": "operador_matriz",
        "description": "Visualização do inventário completo, ativos de rede e relatórios com fluxo de homologação no firewall.",
        "permissions": [
            "sites.view",
            "inventory.view",
        ],
    },
]


def main():
    with Session(engine) as session:

        # -----------------------------------------
        # EMPRESA
        # -----------------------------------------

        company = session.scalar(
            select(Company).where(
                Company.slug == "giassi"
            )
        )

        if company is None:
            company = Company(
                name="Giassi",
                slug="giassi",
                active=True,
            )

            session.add(company)
            session.flush()

            print("Empresa criada: Giassi")

        else:
            print("Empresa já existe: Giassi")


        # -----------------------------------------
        # PERMISSÕES
        # -----------------------------------------

        permission_objects = {}

        for data in PERMISSIONS:

            permission = session.scalar(
                select(Permission).where(
                    Permission.slug == data["slug"]
                )
            )

            if permission is None:
                permission = Permission(
                    name=data["name"],
                    slug=data["slug"],
                    description=data["description"],
                    active=True,
                )

                session.add(permission)
                session.flush()

                print(f"Permissão criada: {data['slug']}")

            permission_objects[data["slug"]] = permission


        # -----------------------------------------
        # PERFIS
        # -----------------------------------------

        for data in ROLES:

            role = session.scalar(
                select(Role).where(
                    Role.slug == data["slug"]
                )
            )

            if role is None:
                role = Role(
                    name=data["name"],
                    slug=data["slug"],
                    description=data["description"],
                    active=True,
                )

                session.add(role)
                session.flush()

                print(f"Perfil criado: {data['slug']}")

            else:
                print(f"Perfil já existe: {data['slug']}")


            # -------------------------------------
            # PERMISSÕES DO PERFIL
            # -------------------------------------

            for permission_slug in data["permissions"]:

                permission = permission_objects[
                    permission_slug
                ]

                if permission not in role.permissions:
                    role.permissions.append(permission)

        session.commit()

        print()
        print("Seed inicial concluído com sucesso.")


if __name__ == "__main__":
    main()
