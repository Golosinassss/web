import os
import pickle
from googleapiclient.discovery import build

TOKEN_PATH = '/home/golosinassss/.openclaw/workspace/token.pickle'
SPREADSHEET_ID = '1-NpQprddYp2vYyl4kRxLO-i_LJbF06MYEf9zaC1s880'

def main():
    creds = None
    if os.path.exists(TOKEN_PATH):
        with open(TOKEN_PATH, 'rb') as token:
            creds = pickle.load(token)
            
    service = build('sheets', 'v4', credentials=creds)
    sheet = service.spreadsheets()

    # Read from the amplificado.tv tab
    result = sheet.values().get(spreadsheetId=SPREADSHEET_ID, range='amplificado.tv!A2:C300').execute()
    values = result.get('values', [])

    if not values:
        print('No data found in amplificado.tv tab.')
        return
    
    append_rows = []
    for row in values:
        if len(row) < 3: continue
        parent_id = row[0].strip().lower()
        title = row[1]
        url = row[2]
        
        tags = 'amplificado.tv'
        if 'dub-de-gaita' in parent_id:
            tags = 'dub de gaita'
            
        # [id, titulo, categoria, descripcion, url_video, tipo, preview_url, date, destacado, tags]
        append_rows.append([
            '',               # A: id
            title,            # B: titulo
            'MÚSICA',         # C: categoria
            f'Sesión de {tags.upper()}', # D: descripcion
            url,              # E: url_video
            'youtube',        # F: tipo
            '',               # G: preview_url
            '2014',           # H: date
            'NO',             # I: destacado
            tags              # J: tags
        ])

    body = {
        'values': append_rows
    }

    print(f"Appending {len(append_rows)} rows to the main sheet...")
    result = sheet.values().append(
        spreadsheetId=SPREADSHEET_ID, 
        range='Videos!A:J',
        valueInputOption='USER_ENTERED', 
        body=body
    ).execute()

    print(f"{result.get('updates').get('updatedCells')} cells appended.")

if __name__ == '__main__':
    main()
