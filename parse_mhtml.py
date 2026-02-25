
import re
import sys
import quopri

def parse_mhtml(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
            
        boundary = None
        current_headers = {}
        capturing_content = False
        content_buffer = []
        frame_count = 0

        # Find boundary
        for line in lines[:100]:
            if 'boundary="' in line:
                boundary = line.split('boundary="')[1].split('"')[0]
                break
        
        if not boundary:
            for line in lines[:100]:
                if line.startswith('------MultipartBoundary'):
                    boundary = line.strip()[2:]
                    break
        
        print(f"Boundary: {boundary}")

        for line in lines:
            if boundary in line:
                # End of previous section
                if capturing_content:
                    if 'playposit.com' in current_headers.get('Content-Location', '') or 'playposit.com' in current_headers.get('Content-ID', ''):
                        frame_count += 1
                        print(f"Found PlayPosit frame {frame_count}: {current_headers}")
                        
                        full_content = "".join(content_buffer)
                        decoded_bytes = quopri.decodestring(full_content.encode('utf-8'))
                        decoded_str = decoded_bytes.decode('utf-8', errors='replace')
                        
                        filename = f'playposit_frame_{frame_count}.html'
                        with open(filename, 'w', encoding='utf-8') as out_f:
                            out_f.write(decoded_str)
                            print(f"Saved to {filename}")

                current_headers = {}
                capturing_content = False
                content_buffer = []
                continue
            
            if not capturing_content:
                if line.strip() == '':
                    capturing_content = True
                else:
                    parts = line.split(': ', 1)
                    if len(parts) == 2:
                        current_headers[parts[0]] = parts[1].strip()
            else:
                content_buffer.append(line)

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    parse_mhtml(sys.argv[1])
