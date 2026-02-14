import os
import google.generativeai as genai
from flask import Flask, request, jsonify

app = Flask(__name__)

# Setup Gemini - The API Key is passed in via Environment Variables for security
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

# Initialize the model (e.g., Gemini 1.5 Flash for speed and cost-efficiency)
model = genai.GenerativeModel('gemini-1.5-flash')

@app.route('/generate', methods=['POST'])
def generate_content():
    data = request.json
    user_prompt = data.get("prompt", "")
    
    if not user_prompt:
        return jsonify({"error": "No prompt provided"}), 400

    try:
        # This is where your AI Studio prompt logic lives
        response = model.generate_content(user_prompt)
        return jsonify({
            "status": "success",
            "text": response.text
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return "OK", 200

if __name__ == "__main__":
    # Cloud Run requires the app to listen on the port defined by the PORT env var
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port)
