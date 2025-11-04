from PyPDF2 import PdfReader, PdfWriter
from datetime import datetime
import os


class PdfService:
    
    @staticmethod
    def embed_signature_in_pdf(
        input_pdf_path: str,
        output_pdf_path: str,
        signature_data: str,
        metadata: dict
    ) -> bool:
        """
        Osadza podpis i metadane w PDF
        
        Args:
            input_pdf_path: Ścieżka do oryginalnego PDF
            output_pdf_path: Ścieżka do podpisanego PDF
            signature_data: Podpis cyfrowy (Base64)
            metadata: Dict z metadanymi (name, location, reason, contact)
        
        Returns:
            bool: True jeśli sukces
        """
        try:
            # Wczytaj PDF
            reader = PdfReader(input_pdf_path)
            writer = PdfWriter()
            
            # Kopiuj wszystkie strony
            for page in reader.pages:
                writer.add_page(page)
            
            # 1. DODAJ METADANE DO PDF
            writer.add_metadata({
                '/Author': metadata.get('name', 'Unknown'),
                '/Subject': f"Digitally Signed: {metadata.get('reason', 'Document Approval')}",
                '/Keywords': f"Digital Signature, RSA-PSS, SHA-256, Signed by {metadata.get('name', 'Unknown')}",
                '/Creator': 'PDF Digital Signature System',
                '/Producer': 'FastAPI + PyPDF2',
                '/Title': metadata.get('filename', 'Signed Document'),
                '/SignedAt': datetime.utcnow().isoformat(),
                '/SignerLocation': metadata.get('location', ''),
                '/SignerContact': metadata.get('contact', ''),
                '/SignatureData': signature_data[:100] + '...',
            })
            
            # 2. DODAJ ADNOTACJĘ NA PIERWSZEJ STRONIE
            first_page = writer.pages[0]
            
            # Tekst adnotacji (widoczny w Adobe Reader)
            annotation_text = (
                f"🔒 DIGITALLY SIGNED\n"
                f"━━━━━━━━━━━━━━━━━━━━━━━\n"
                f"Signer: {metadata.get('name', 'Unknown')}\n"
                f"Date: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}\n"
                f"Location: {metadata.get('location', 'N/A')}\n"
                f"Reason: {metadata.get('reason', 'N/A')}\n"
                f"Contact: {metadata.get('contact', 'N/A')}\n"
                f"━━━━━━━━━━━━━━━━━━━━━━━\n"
                f"Algorithm: RSA-PSS (2048-bit) + SHA-256\n"
                f"Signature (partial): {signature_data[:60]}...\n"
                f"━━━━━━━━━━━━━━━━━━━━━━━\n"
                f"This document has been digitally signed.\n"
                f"Do not modify - signature will be invalid!"
            )
            
            # Dodaj adnotację tekstową (sticky note)
            first_page.add_annotation({
                '/Type': '/Annot',
                '/Subtype': '/Text',
                '/Rect': [50, 750, 100, 800],
                '/Contents': annotation_text,
                '/Name': '/Comment',
                '/T': 'Digital Signature',
                '/C': [1, 1, 0],
            })
            
            # 3. ZAPISZ NOWY PDF
            with open(output_pdf_path, 'wb') as output_file:
                writer.write(output_file)
            
            return True
            
        except Exception as e:
            print(f"Error embedding signature in PDF: {e}")
            return False
