"""
Script para leer el contenido del PDF de plantilla
"""
import PyPDF2

pdf_path = r"C:\Users\ramir\Downloads\contrato_prestamo_legal_template (1).pdf"

try:
    with open(pdf_path, 'rb') as file:
        pdf_reader = PyPDF2.PdfReader(file)
        print(f"Número de páginas: {len(pdf_reader.pages)}\n")
        
        for i, page in enumerate(pdf_reader.pages):
            text = page.extract_text()
            print(f"=== Página {i+1} ===")
            print(text)
            print("\n")
except Exception as e:
    print(f"Error: {e}")
