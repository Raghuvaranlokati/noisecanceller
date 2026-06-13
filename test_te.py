import urllib.request
req = urllib.request.Request('https://upload.wikimedia.org/wikipedia/commons/1/1f/Telugu_spoken.ogg', headers={'User-Agent': 'Mozilla/5.0'})
data = urllib.request.urlopen(req).read()
open('telugu.ogg', 'wb').write(data)

from faster_whisper import WhisperModel
model = WhisperModel('small', device='cpu', compute_type='int8')
segments, info = model.transcribe('telugu.ogg', language='te')
print('TRANSCRIPT:', [s.text for s in segments])
