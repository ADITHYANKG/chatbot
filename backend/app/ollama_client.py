import requests
import logging

# Configure logging


# Step 1: Add the path of `examples` to Python path


API_URL_FILE = "http://172.21.1.136:5051/ask_llm" #for file
API_URL_IMAGE = "http://172.21.1.136:5051/generate_image" #for image
API_URL_DB="http://172.21.1.136:5055/query-db"
API_URL_CONNECT = "http://172.21.1.136:5055/connect-db"
API_URL_DISCONNECT = "http://172.21.1.136:5055/disconnect-db"


#for database
  # Update with the actual URL
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

def connect_ollama_db(db_config: dict,fetch_mode:bool=False):
    """Send DB credentials to the MCP backend to establish a connection."""
    try:
        print("hits ollama client")
        print("fetch_mode",fetch_mode)
        response = requests.post(API_URL_CONNECT, json={"db_config": db_config,"fetch_mode":fetch_mode},timeout=10)
        print("📥 MCP response status:", response.status_code)
        try:
            return response.json()
        except Exception:
            return {"status":"error","message":"Invalid response format from DB server"}
       
    except requests.exceptions.Timeout:
        print("❌ Timeout while connecting to MCP backend")
        return {"status": "error", "message": "Timeout while connecting to database server"}

    except requests.exceptions.RequestException as e:
        print("❌ Connection error:", e)
        return {"status": "error", "message": str(e)}




def disconnect_ollama_db():
    """Trigger MCP backend to disconnect the DB."""
    try:
        response = requests.post(API_URL_DISCONNECT)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.error(f"DB Disconnect Error: {e}")
        return {"status": "error", "message": str(e)}


def query_ollama(file_text: str, user_query: str,mode:str):
    """Send a query to the AI model."""
    if mode=="image":
        try:
            payload={"prompt":user_query}
            response = requests.post(API_URL_IMAGE, json=payload) 
            response.raise_for_status()
            return response.json().get("image_base64")
        except Exception as e:
            logger.error(f"Request failed: {e}")
            return "Error processing request."
    elif mode=="file":
        try:
            payload = {"file_content": file_text, "query": user_query}
            response=requests.post(API_URL_FILE,json=payload)
            response.raise_for_status()
            return response.json().get("result","No valid response")
        except requests.exceptions.Timeout:
            logger.error("Request to LLM API timed out")
            return "Error: LLM API timeout."

        except requests.exceptions.RequestException as e:
            logger.error(f"Error connecting to LLM API: {e}")
            return "Error connecting to LLM."
    else:
        try:
            payload={"query":user_query}
            response = requests.post(API_URL_DB, json=payload) 
            response.raise_for_status()
            return response.json().get("result","no valid database response")
        except requests.exceptions.Timeout:
            logger.error("Database API timed out.")
            return "Error: Database API timeout."
        except requests.exceptions.HTTPError as http_err:
            try:
                # Try extracting detailed error message from JSON
                error_detail = response.json().get("detail", str(http_err))
            except Exception:
                error_detail = str(http_err)
            logger.error(f"HTTP error: {error_detail}")
            return f"{error_detail}"
        except requests.exceptions.RequestException as req_err:
            logger.error(f"Database API error: {req_err}")
            return f"Error connecting to database API: {str(req_err)}"

        # except requests.exceptions.RequestException as e:
        #     logger.error(f"Database API error: {e}")
        #     return "Error connecting to database API."
    
    
        
    
    # try:
    #     payload = {"file_content": file_text, "query": user_query}
    #     # logger.error(f"payload: {payload}")
    
    #     response = requests.post(API_URL_FILE, json=payload)  # ✅ Set a timeout
    #     response.raise_for_status()  # ✅ Raise error if status is not 200

    #     response_data = response.json()
    #     return response_data.get("result", "No valid response found")
        
    # except requests.exceptions.Timeout:
    #     logger.error("Request to LLM API timed out")
    #     return "Error: LLM API timeout."
        
    # except requests.exceptions.RequestException as e:
    #     logger.error(f"Error connecting to LLM API: {e}")
    #     return "Error connecting to LLM."
        