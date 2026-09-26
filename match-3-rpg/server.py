"""Локальный сервер для Dungeon Match.

ES-модули (type="module") браузер не грузит с file:// из-за CORS,
поэтому игра запускается через http://127.0.0.1:8000/index.html

Запуск:  python server.py   (или двойным кликом run.bat)
"""
import http.server
import functools

HOST, PORT = '127.0.0.1', 8000


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # без кеша — удобно править код и обновлять страницу
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


if __name__ == '__main__':
    with http.server.ThreadingHTTPServer((HOST, PORT), Handler) as httpd:
        print(f'Dungeon Match: http://{HOST}:{PORT}/index.html')
        print('Остановка: Ctrl+C')
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\nСервер остановлен.')
