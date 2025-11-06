from PyPDF2 import PdfReader, PdfWriter
from PyPDF2.generic import (
    DictionaryObject,
    ArrayObject,
    NumberObject,
    NameObject,
    TextStringObject,
    IndirectObject
)
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
        Osadza podpis i metadane w PDF (PyPDF2 3.x compatible)
        """
        try:
            reader = PdfReader(input_pdf_path)
            writer = PdfWriter()

            # Kopiuj wszystkie strony
            for page in reader.pages:
                writer.add_page(page)

            # Pobierz rozmiar klucza z metadanych (domyślnie 2048)
            key_size = metadata.get('keySize', 2048)

            # ✅ METADANE PDF
            writer.add_metadata({
                '/Author': metadata.get('name', 'Unknown'),
                '/Subject': f"Digitally Signed: {metadata.get('reason', 'Document Approval')}",
                '/Keywords': f"Digital Signature, RSA-PSS, SHA-256, {key_size}-bit, Signed by {metadata.get('name', 'Unknown')}",
                '/Creator': 'PDF Digital Signature System',
                '/Producer': 'FastAPI + PyPDF2',
                '/Title': metadata.get('filename', 'Signed Document'),
                '/SignedAt': datetime.utcnow().isoformat(),
                '/SignerLocation': metadata.get('location', ''),
                '/SignerContact': metadata.get('contact', ''),
                '/SignatureAlgorithm': f'RSA-PSS ({key_size}-bit) + SHA-256',
                '/SignatureData': signature_data[:100] + '...',
            })

            # ✅ ADNOTACJA (Poprawiona składnia - wszystkie klucze jako NameObject)
            if len(writer.pages) > 0:
                try:
                    annotation_text = (
                        f"🔒 DIGITALLY SIGNED\n"
                        f"━━━━━━━━━━━━━━━━━━━━━━━\n"
                        f"Signer: {metadata.get('name', 'Unknown')}\n"
                        f"Date: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}\n"
                        f"Location: {metadata.get('location', 'N/A')}\n"
                        f"Reason: {metadata.get('reason', 'N/A')}\n"
                        f"Contact: {metadata.get('contact', 'N/A')}\n"
                        f"━━━━━━━━━━━━━━━━━━━━━━━\n"
                        f"Algorithm: RSA-PSS ({key_size}-bit) + SHA-256\n"
                        f"Signature: {signature_data[:60]}...\n"
                        f"━━━━━━━━━━━━━━━━━━━━━━━\n"
                        f"This document has been digitally signed.\n"
                        f"Do not modify - signature will be invalid!"
                    )

                    # Utwórz adnotację - WSZYSTKIE klucze jako NameObject!
                    annotation = DictionaryObject()
                    annotation[NameObject('/Type')] = NameObject('/Annot')
                    annotation[NameObject('/Subtype')] = NameObject('/Text')
                    annotation[NameObject('/Rect')] = ArrayObject([
                        NumberObject(50),
                        NumberObject(750),
                        NumberObject(100),
                        NumberObject(800)
                    ])
                    annotation[NameObject('/Contents')] = TextStringObject(annotation_text)
                    annotation[NameObject('/Name')] = NameObject('/Comment')
                    annotation[NameObject('/T')] = TextStringObject('Digital Signature')
                    annotation[NameObject('/C')] = ArrayObject([
                        NumberObject(1),
                        NumberObject(1),
                        NumberObject(0)
                    ])

                    # Dodaj do pierwszej strony
                    first_page = writer.pages[0]

                    # Inicjalizuj /Annots jeśli nie istnieje
                    if NameObject('/Annots') not in first_page:
                        first_page[NameObject('/Annots')] = ArrayObject()

                    # Dodaj adnotację
                    first_page[NameObject('/Annots')].append(writer._add_object(annotation))
                    print(f"✅ Annotation added successfully with {key_size}-bit key info")

                except Exception as annot_error:
                    print(f"⚠️ Warning: Could not add annotation: {annot_error}")
                    # Kontynuuj bez adnotacji - metadane są najważniejsze

            # ✅ ZAPISZ
            with open(output_pdf_path, 'wb') as output_file:
                writer.write(output_file)

            return True

        except Exception as e:
            print(f"❌ Error embedding signature: {e}")
            return False
