import time
import requests

BASE_URL = "http://localhost:8000"
# Short YouTube video without much music, maybe a short 10s clip
# A public domain short video or something simple.
# Since we just want to verify, let's use a very short test video URL.
TEST_URL = "https://www.youtube.com/watch?v=BaW_CjWqE44" # Short 10 second test video

def test_workflow():
    print("Starting process...")
    res = requests.post(f"{BASE_URL}/api/process", json={"url": TEST_URL})
    if res.status_code != 200:
        print("Failed to start:", res.text)
        return
        
    task_id = res.json()["task_id"]
    print(f"Task started: {task_id}")
    
    while True:
        status_res = requests.get(f"{BASE_URL}/api/status/{task_id}")
        data = status_res.json()
        print(f"Progress: {data['progress']}% - {data['message']}")
        
        if data['status'] == 'completed':
            print("Download ready!")
            break
        elif data['status'] == 'failed':
            print("Processing failed!")
            break
            
        time.sleep(3)

if __name__ == "__main__":
    test_workflow()
