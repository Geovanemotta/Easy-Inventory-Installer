import os

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models import Company, Role, User


DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)


USERNAME = "admin"
FULL_NAME = "Administrador do Sistema"
EMAIL = "admin@giassi.com.br"


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
                Role.slug == "superadmin"
            )
        )

        if role is None:
            raise RuntimeError(
                "Perfil superadmin não encontrado."
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
            "Digite a senha inicial do administrador: "
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
            is_superadmin=True,
        )

        user.roles.append(role)

        session.add(user)
        session.commit()

        print()
        print("Usuário administrador criado com sucesso.")
        print(f"Usuário: {USERNAME}")
        print(f"Perfil: {role.name}")


if __name__ == "__main__":
    main()
