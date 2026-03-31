import os
import sys
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

from app.core.database import SessionLocal
# --- IMPORTANTE: Ajusta esta importación al nombre de tu archivo ---
from app.models.roles import Role, RoleEnum 

def seed_roles():
    db = SessionLocal()
    try:
        # Iteramos directamente sobre tu Enum para no equivocarnos de nombre
        for rol in RoleEnum:
            nombre_rol = rol.value
            
            rol_existente = db.query(Role).filter(Role.nombre == nombre_rol).first()
            
            if not rol_existente:
                print(f"Creando nuevo rol: {nombre_rol}")
                # Aprovechamos para llenar la descripción también
                nuevo_rol = Role(
                    nombre=nombre_rol, 
                    descripcion=f"Rol del sistema para {nombre_rol.lower()}"
                )
                db.add(nuevo_rol)
            else:
                print(f"El rol '{nombre_rol}' ya estaba registrado.")
        
        db.commit()
        print("✅ Seed de roles completado exitosamente.")
        
    except Exception as e:
        print(f"❌ Ocurrió un error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("Iniciando la inserción de datos iniciales...")
    seed_roles()