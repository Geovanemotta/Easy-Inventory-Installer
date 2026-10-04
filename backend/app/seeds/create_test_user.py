import os

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models import Company, Role, User, Site
from app.models.user_site_access import user_site_access


DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)


USERNAME = "lj01"
FULL_NAME = "Usuário Loja 01"
EMAIL = "lj01@giassi.com.br"
SITE_CODE = "01"


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
            raise RuntimeError(
                "Empresa Giassi não encontrada."
            )

        # -----------------------------------------
        # PERFIL
        # -----------------------------------------

        role = session.scalar(
            select(Role).where(
                Role.slug == "operator"
            )
        )

        if role is None:
            raise RuntimeError(
                "Perfil operator não encontrado."
            )

        # -----------------------------------------
        # SITE
        # -----------------------------------------

        site = session.scalar(
            select(Site).where(
                Site.company_id == company.id,
                Site.code == SITE_CODE,
            )
        )

        if site is None:
            raise RuntimeError(
                f"Loja {SITE_CODE} não encontrada."
            )

        # -----------------------------------------
        # USUÁRIO
        # -----------------------------------------

        user = session.scalar(
            select(User).where(
                User.company_id == company.id,
                User.username == USERNAME,
            )
        )

        if user is not None:
            print(
                f"Usuário '{USERNAME}' já existe."
            )
            return

        # -----------------------------------------
        # SENHA
        # -----------------------------------------

        password = input(
            "Digite a senha inicial do usuário lj01: "
        )

        if len(password) < 8:
            raise RuntimeError(
                "A senha deve possuir pelo menos 8 caracteres."
            )

        # -----------------------------------------
        # CRIA USUÁRIO
        # -----------------------------------------

        user = User(
            company_id=company.id,
            username=USERNAME,
            email=EMAIL,
            full_name=FULL_NAME,
            password_hash=hash_password(password),
            active=True,
            is_superadmin=False,
        )

        user.roles.append(role)

        session.add(user)
        session.flush()

        # -----------------------------------------
        # ACESSO À LOJA
        # -----------------------------------------

        session.execute(
            user_site_access.insert().values(
                user_id=user.id,
                site_id=site.id,
            )
        )

        session.commit()

        print()
        print("Usuário criado com sucesso.")
        print(f"Usuário: {USERNAME}")
        print(f"Perfil: {role.name}")
        print(f"Site: {site.name}")
        print(f"Site ID: {site.id}")


if __name__ == "__main__":
    main()
