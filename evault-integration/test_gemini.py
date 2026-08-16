import os
import google.generativeai as genai

from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

try:
    model = genai.GenerativeModel('gemini-flash-latest')
    response = model.generate_content("Say 'Gemini is working!'")
    print(f"SUCCESS: {response.text}")
except Exception as e:
    print(f"FAILED: {e}")
