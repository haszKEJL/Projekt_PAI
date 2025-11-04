# Szybka Instalacja - 5 Minut

## 1. Pobierz Projekt

git clone https://github.com/haszKEJL/Projekt_PAI.git
cd Projekt_PAI


## 2. Backend

cd backend
python -m venv venv

# Windows:
.\venv\Scripts\Activate.ps1

# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
python -m app.database
python -m uvicorn app.main:app --reload --port 8000


Backend: http://localhost:8000


## 3. Frontend (nowe okno terminala)

cd frontend
npm install
npm run dev


Frontend: http://localhost:5173


## Gotowe!

1. Otwórz http://localhost:5173
2. Wygeneruj klucze
3. Podpisz PDF
4. Zweryfikuj!
