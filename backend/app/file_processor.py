import pdfplumber
import pandas as pd
from pathlib import Path
import logging
from pdf2image import convert_from_path
import pytesseract
# Configure logging
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
poppler_path = r"C:\poppler\poppler-24.08.0\Library\bin"
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

def extract_text_from_file(file_path: Path):
    """Extract content from various file types."""
    try:
        if file_path.suffix.lower() == ".pdf":
            text = extract_text_from_pdf(file_path)
            if not text.strip():
                print("plumper cant")  # If pdfplumber couldn't extract any text
                logger.info(f"No text found in PDF via pdfplumber, trying OCR for {file_path}")
                text = extract_text_from_scanned_pdf(file_path)
            return {"is_tabular": False, "text": text}
        elif file_path.suffix.lower() in [".xls", ".xlsx", ".csv"]:
            return extract_tabular_data(file_path)
        elif file_path.suffix.lower() == ".txt":
            return {"is_tabular": False, "text": extract_text_from_txt(file_path)}
        else:
            return {"is_tabular": False, "text": extract_text_generic(file_path)}
    except Exception as e:
        logger.error(f"Error processing file {file_path}: {e}")
        return {"is_tabular": False, "text": f"Error processing file: {str(e)}"}

def extract_text_from_pdf(pdf_path: Path) -> str:
    """Extract text from a PDF file."""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            return "\n".join([page.extract_text() or "" for page in pdf.pages])
    except Exception as e:
        logger.error(f"Failed to extract text from PDF {pdf_path}: {e}")
        return "Error extracting text from PDF."

def extract_tabular_data(file_path: Path):
    """Extract tabular data from CSV or Excel files and clean NaN values."""
    try:
        if file_path.suffix.lower() == ".csv":
            df = pd.read_csv(file_path, dtype=str, encoding="utf-8")
        else:
            df = pd.read_excel(file_path, dtype=str)

        df.fillna("", inplace=True)
        headers = df.columns.tolist()
        rows = df.astype(str).values.tolist()

        logger.info(f"Extracted table with {len(headers)} columns and {len(rows)} rows from {file_path}")

        return {"is_tabular": True, "headers": headers, "rows": rows}
    except Exception as e:
        logger.error(f"Error processing table file {file_path}: {e}")
        return {"is_tabular": False, "text": f"Error processing table: {str(e)}"}

def extract_text_from_txt(txt_path: Path) -> str:
    """Extract text from a plain text file."""
    try:
        with open(txt_path, "r", encoding="utf-8") as file:
            return file.read()
    except Exception as e:
        logger.error(f"Error reading text file {txt_path}: {e}")
        return "Error extracting text from TXT file."

def extract_text_generic(file_path: Path) -> str:
    """Try reading any other file format as text."""
    try:
        with open(file_path, "r", encoding="utf-8") as file:
            return file.read()
    except Exception as e:
        logger.warning(f"Unsupported or unreadable file format {file_path}: {e}")
        return "Unsupported file format or non-text file."
def extract_text_from_scanned_pdf(file_path: Path) -> str:
    """Extract text from a scanned PDF using OCR (Tesseract)."""
    try:
        images = convert_from_path(file_path, poppler_path=poppler_path)
        full_text = ""

        for img in images:
            full_text += pytesseract.image_to_string(img) + "\n"

        return full_text.strip()
    except Exception as e:
        logger.warning(f"Failed OCR extraction from scanned PDF {file_path}: {e}")
        return "Error extracting text from scanned PDF."

