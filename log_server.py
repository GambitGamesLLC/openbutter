#!/usr/bin/env python3
"""
OpenButter Log Server
HTTP server that accepts browser logs via POST and writes them to a file.
Also serves static files for the application.
"""

import http.server
import socketserver
import json
import os
import sys
from datetime import datetime
from pathlib import Path

# Configuration
PORT = 8080
LOG_DIR = Path("logs")
LOG_FILE = LOG_DIR / "browser.log"

# Ensure log directory exists
LOG_DIR.mkdir(parents=True, exist_ok=True)

class LogHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP request handler with POST /logs endpoint"""
    
    def log_message(self, format, *args):
        """Override to suppress default request logging"""
        # Only log non-log requests to keep output clean
        message = format % args
        if '/logs' not in message:
            print(f"[{datetime.now().isoformat()}] {message}")
    
    def do_POST(self):
        """Handle POST requests - specifically /logs endpoint"""
        content_length = int(self.headers.get('Content-Length', 0))
        client = self.client_address[0]
        
        print(f"[DEBUG] POST {self.path} from {client}, Content-Length: {content_length}")
        
        if self.path == '/logs':
            try:
                # Read the request body
                body = self.rfile.read(content_length).decode('utf-8')
                print(f"[DEBUG] Body preview: {body[:100]}...")
                
                # Parse and validate the log entry
                try:
                    log_entry = json.loads(body)
                except json.JSONDecodeError as e:
                    self.send_error(400, f"Invalid JSON: {e}")
                    return
                
                # Ensure required fields
                if not isinstance(log_entry, dict):
                    self.send_error(400, "Log entry must be an object")
                    return
                
                # Add server timestamp if not present
                if 'serverTimestamp' not in log_entry:
                    log_entry['serverTimestamp'] = datetime.now().isoformat()
                
                # Append to log file (one JSON line per entry)
                with open(LOG_FILE, 'a', encoding='utf-8') as f:
                    f.write(json.dumps(log_entry, ensure_ascii=False) + '\n')
                    f.flush()
                
                # Send success response
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', 'Content-Type')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'ok'}).encode())
                
            except Exception as e:
                print(f"[ERROR] Failed to write log: {e}", file=sys.stderr)
                self.send_error(500, f"Internal server error: {e}")
        else:
            self.send_error(404, "Not found")
    
    def do_GET(self):
        """Handle GET requests - add /logs-view and /gateway-proxy endpoints"""
        if self.path == '/logs-view':
            # Return log file contents
            try:
                self.send_response(200)
                self.send_header('Content-Type', 'text/plain')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                if LOG_FILE.exists():
                    with open(LOG_FILE, 'r') as f:
                        self.wfile.write(f.read().encode())
                else:
                    self.wfile.write(b'No logs yet')
            except Exception as e:
                self.send_error(500, f"Error reading logs: {e}")
        elif self.path == '/gateway-sessions':
            # Proxy request to OpenClaw Gateway to avoid CORS
            self._proxy_to_gateway()
        else:
            # Serve static files
            super().do_GET()
    
    def _proxy_to_gateway(self):
        """Get sessions via OpenClaw CLI"""
        import subprocess
        
        try:
            result = subprocess.run(
                ['openclaw', 'sessions', 'list', '--json'],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode != 0:
                raise Exception(f"CLI error: {result.stderr}")
            
            data = result.stdout.encode()
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(data)
            
        except Exception as e:
            print(f"[ERROR] CLI failed: {e}", file=sys.stderr)
            self.send_error(502, f"CLI error: {e}")
    
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

class ReusableTCPServer(socketserver.TCPServer):
    """TCP server that allows address reuse"""
    allow_reuse_address = True

def main():
    """Start the log server"""
    print(f"🧈 OpenButter Log Server")
    print(f"   Port: {PORT}")
    print(f"   Log file: {LOG_FILE.absolute()}")
    print(f"   Static files: {os.getcwd()}")
    print(f"   POST /logs - Submit log entries")
    print(f"   GET /* - Serve static files")
    print(f"\n   Server starting at http://localhost:{PORT}/\n")
    
    try:
        with ReusableTCPServer(("", PORT), LogHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\n🛑 Server stopped by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Server error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
