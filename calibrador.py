#!/usr/bin/env python3
"""
HADES CALIBRADOR - Herramienta de calibración visual para OCR
Determina las coordenadas exactas donde aparecen los nombres de los dioses
"""

import tkinter as tk
from tkinter import messagebox
import mss
import cv2
import numpy as np
import pytesseract
import pyperclip
import threading
import re
import json
import os

# Configuración de Tesseract (ajustar ruta según instalación)
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

class CalibradorHades:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Hades Calibrador")
        
        # Pantalla completa sin bordes
        self.root.attributes('-alpha', 0.3)
        self.root.attributes('-topmost', True)
        self.root.overrideredirect(True)
        
        # Canvas que cubre toda la pantalla
        self.screen_width = self.root.winfo_screenwidth()
        self.screen_height = self.root.winfo_screenheight()
        self.root.geometry(f"{self.screen_width}x{self.screen_height}+0+0")
        
        self.canvas = tk.Canvas(self.root, bg='black', highlightthickness=0)
        self.canvas.pack(fill=tk.BOTH, expand=True)
        
        # Patrón de puntos para el fondo
        for x in range(0, self.screen_width, 30):
            for y in range(0, self.screen_height, 30):
                self.canvas.create_oval(x, y, x+2, y+2, fill='gray40', outline='')
        
        # Área de captura inicial (centro de pantalla)
        self.rect_x = self.screen_width // 2 - 200
        self.rect_y = 300
        self.rect_w = 400
        self.rect_h = 100
        
        # Estado de interacción
        self.dragging = False
        self.resizing = None
        self.drag_start_x = 0
        self.drag_start_y = 0
        self.start_rect_x = 0
        self.start_rect_y = 0
        
        # Crear rectángulo y handles
        self.rect_id = None
        self.handles = {}
        self.draw_rect()
        
        # Panel de info
        self.info_frame = tk.Frame(self.root, bg='#1a1a1a', bd=2, relief=tk.RIDGE)
        self.info_frame.place(x=20, y=self.screen_height - 180)
        
        tk.Label(self.info_frame, text="HADES CALIBRADOR", 
                bg='#1a1a1a', fg='#d4af37', font=('Consolas', 12, 'bold')).pack(pady=5)
        
        tk.Label(self.info_frame, text="─────────────────────────────────────────", 
                bg='#1a1a1a', fg='#666666', font=('Consolas', 9)).pack()
        
        self.coord_label = tk.Label(self.info_frame, 
                                   text="top=300  left=800  width=400  height=100",
                                   bg='#1a1a1a', fg='#00ff00', font=('Consolas', 10))
        self.coord_label.pack(pady=5)
        
        tk.Label(self.info_frame, text="Texto detectado:", 
                bg='#1a1a1a', fg='#aaaaaa', font=('Consolas', 9)).pack(anchor=tk.W, padx=10)
        
        self.text_label = tk.Label(self.info_frame, text='""', 
                                  bg='#1a1a1a', fg='#ffffff', font=('Consolas', 10, 'italic'),
                                  wraplength=350)
        self.text_label.pack(pady=5, padx=10)
        
        # Botones
        btn_frame = tk.Frame(self.info_frame, bg='#1a1a1a')
        btn_frame.pack(pady=10)
        
        self.copy_btn = tk.Button(btn_frame, text="COPIAR COORDENADAS", 
                                 command=self.copiar_coordenadas,
                                 bg='#2a2a2a', fg='#d4af37', font=('Consolas', 9),
                                 activebackground='#d4af37', activeforeground='#000000')
        self.copy_btn.pack(side=tk.LEFT, padx=5)
        
        tk.Button(btn_frame, text="ESC = Salir", command=self.salir,
                 bg='#4a0000', fg='#ffffff', font=('Consolas', 9)).pack(side=tk.LEFT, padx=5)
        
        # Bindings
        self.canvas.bind("<Button-1>", self.on_press)
        self.canvas.bind("<B1-Motion>", self.on_drag)
        self.canvas.bind("<ButtonRelease-1>", self.on_release)
        self.root.bind("<Escape>", lambda e: self.salir())
        self.root.bind("<F5>", lambda e: self.copiar_coordenadas())
        
        # Flag para saber si detectamos algo
        self.hubo_deteccion = False
        
        # Iniciar loop de OCR
        self.actualizar_ocr()
        
    def draw_rect(self):
        """Dibuja el rectángulo y los handles de redimensionamiento"""
        # Eliminar elementos anteriores
        if self.rect_id:
            self.canvas.delete(self.rect_id)
        for h in self.handles.values():
            self.canvas.delete(h)
        
        x, y, w, h = self.rect_x, self.rect_y, self.rect_w, self.rect_h
        
        # Rectángulo principal (rojo semitransparente)
        self.rect_id = self.canvas.create_rectangle(
            x, y, x+w, y+h, 
            outline='#ff4444', width=3, fill='',
            stipple='gray50'
        )
        
        # Handles en las esquinas (8x8)
        handle_size = 8
        positions = {
            'nw': (x - handle_size//2, y - handle_size//2),
            'ne': (x + w - handle_size//2, y - handle_size//2),
            'sw': (x - handle_size//2, y + h - handle_size//2),
            'se': (x + w - handle_size//2, y + h - handle_size//2),
            'n': (x + w//2 - handle_size//2, y - handle_size//2),
            's': (x + w//2 - handle_size//2, y + h - handle_size//2),
            'w': (x - handle_size//2, y + h//2 - handle_size//2),
            'e': (x + w - handle_size//2, y + h//2 - handle_size//2),
        }
        
        for name, (hx, hy) in positions.items():
            self.handles[name] = self.canvas.create_rectangle(
                hx, hy, hx+handle_size, hy+handle_size,
                fill='#ff4444', outline='#ffffff', width=1
            )
    
    def get_handle_at(self, x, y):
        """Determina qué handle está bajo el cursor (si hay alguno)"""
        handle_size = 12  # Zona sensible más grande
        
        checks = {
            'nw': (self.rect_x, self.rect_y),
            'ne': (self.rect_x + self.rect_w, self.rect_y),
            'sw': (self.rect_x, self.rect_y + self.rect_h),
            'se': (self.rect_x + self.rect_w, self.rect_y + self.rect_h),
            'n': (self.rect_x + self.rect_w//2, self.rect_y),
            's': (self.rect_x + self.rect_w//2, self.rect_y + self.rect_h),
            'w': (self.rect_x, self.rect_y + self.rect_h//2),
            'e': (self.rect_x + self.rect_w, self.rect_y + self.rect_h//2),
        }
        
        for name, (hx, hy) in checks.items():
            if abs(x - hx) < handle_size and abs(y - hy) < handle_size:
                return name
        return None
    
    def on_press(self, event):
        """Maneja clic inicial"""
        x, y = event.x, event.y
        
        # Verificar si clickeó un handle
        handle = self.get_handle_at(x, y)
        if handle:
            self.resizing = handle
            self.dragging = False
        # Verificar si clickeó dentro del rectángulo
        elif (self.rect_x <= x <= self.rect_x + self.rect_w and 
              self.rect_y <= y <= self.rect_y + self.rect_h):
            self.dragging = True
            self.resizing = None
        else:
            return
        
        self.drag_start_x = x
        self.drag_start_y = y
        self.start_rect_x = self.rect_x
        self.start_rect_y = self.rect_y
        self.start_rect_w = self.rect_w
        self.start_rect_h = self.rect_h
    
    def on_drag(self, event):
        """Maneja arrastre"""
        if not self.dragging and not self.resizing:
            return
        
        dx = event.x - self.drag_start_x
        dy = event.y - self.drag_start_y
        
        if self.dragging:
            # Mover rectángulo
            self.rect_x = max(0, min(self.screen_width - self.rect_w, 
                                    self.start_rect_x + dx))
            self.rect_y = max(0, min(self.screen_height - self.rect_h, 
                                    self.start_rect_y + dy))
        elif self.resizing:
            # Redimensionar según el handle
            r = self.resizing
            
            if 'e' in r:  # East
                self.rect_w = max(50, self.start_rect_w + dx)
            if 'w' in r:  # West
                new_w = max(50, self.start_rect_w - dx)
                self.rect_x = self.start_rect_x + (self.start_rect_w - new_w)
                self.rect_w = new_w
            if 's' in r:  # South
                self.rect_h = max(30, self.start_rect_h + dy)
            if 'n' in r:  # North
                new_h = max(30, self.start_rect_h - dy)
                self.rect_y = self.start_rect_y + (self.start_rect_h - new_h)
                self.rect_h = new_h
        
        self.draw_rect()
        self.actualizar_coordenadas()
    
    def on_release(self, event):
        """Finaliza arrastre"""
        self.dragging = False
        self.resizing = None
    
    def actualizar_coordenadas(self):
        """Actualiza el label de coordenadas"""
        text = f"top={int(self.rect_y)}  left={int(self.rect_x)}  width={int(self.rect_w)}  height={int(self.rect_h)}"
        self.coord_label.config(text=text)
    
    def copiar_coordenadas(self):
        """Copia coordenadas al portapapeles"""
        coords = f'{{"top": {int(self.rect_y)}, "left": {int(self.rect_x)}, "width": {int(self.rect_w)}, "height": {int(self.rect_h)}}}'
        pyperclip.copy(coords)
        
        # Feedback visual
        original_bg = self.copy_btn.cget('bg')
        self.copy_btn.config(bg='#00aa00', text='✓ COPIADO!')
        self.root.after(2000, lambda: self.copy_btn.config(bg=original_bg, text='COPIAR COORDENADAS'))
    
    def actualizar_ocr(self):
        """Loop de OCR cada 500ms"""
        try:
            with mss.mss() as sct:
                monitor = {
                    "top": int(self.rect_y),
                    "left": int(self.rect_x),
                    "width": int(self.rect_w),
                    "height": int(self.rect_h)
                }
                
                # Capturar
                img = np.array(sct.grab(monitor))
                
                # Preprocesamiento óptimo para texto de videojuegos
                gris = cv2.cvtColor(img, cv2.COLOR_BGRA2GRAY)
                
                # Threshold adaptativo de Otsu
                _, thresh = cv2.threshold(gris, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
                
                # Escalar 2x para mejorar precisión
                escalada = cv2.resize(thresh, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
                
                # OCR con config optimizada
                custom_config = r'--oem 1 --psm 6 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzáéíóúüñÁÉÍÓÚÜÑ '
                texto = pytesseract.image_to_string(escalada, config=custom_config).strip()
                
                if texto:
                    # Limpiar y mostrar
                    texto_limpio = texto.replace('\n', ' ').strip()
                    self.text_label.config(text=f'"{texto_limpio[:50]}"' if len(texto_limpio) <= 50 else f'"{texto_limpio[:47]}..."')
                    self.hubo_deteccion = True
                    
                    # Highlight si detecta un dios conocido
                    dioses = ["artemisa", "atenea", "zeus", "poseidon", "afrodita", "ares", "dionisio", "demeter", "hermes"]
                    if any(dios in texto_limpio.lower() for dios in dioses):
                        self.text_label.config(fg='#00ff00')
                    else:
                        self.text_label.config(fg='#ffffff')
                else:
                    self.text_label.config(text='"(sin texto)"', fg='#666666')
                    
        except Exception as e:
            self.text_label.config(text=f'Error: {str(e)[:40]}', fg='#ff4444')
        
        # Programar próxima actualización
        self.root.after(500, self.actualizar_ocr)
    
    def salir(self):
        """Cierra el calibrador"""
        if self.hubo_deteccion:
            respuesta = messagebox.askyesno(
                "Guardar coordenadas",
                "Se detectó texto exitosamente. ¿Quieres guardar estas coordenadas en config.json?\n\n" +
                f"Coordenadas actuales:\n{{'top': {int(self.rect_y)}, 'left': {int(self.rect_x)}, 'width': {int(self.rect_w)}, 'height': {int(self.rect_h)}}}",
                icon='question'
            )
            
            if respuesta:
                self.guardar_en_ojo()
        
        self.root.destroy()
    
    def guardar_en_ojo(self):
        """Guarda las coordenadas en config.json (compartido con ojo.py)"""
        try:
            config_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'config.json')

            # Leer config existente para no perder otros valores
            try:
                with open(config_path, 'r', encoding='utf-8') as f:
                    config_data = json.load(f)
            except (FileNotFoundError, json.JSONDecodeError):
                config_data = {}

            # Actualizar solo las coordenadas del monitor
            config_data['monitor'] = {
                "top": int(self.rect_y),
                "left": int(self.rect_x),
                "width": int(self.rect_w),
                "height": int(self.rect_h)
            }

            with open(config_path, 'w', encoding='utf-8') as f:
                json.dump(config_data, f, indent=2, ensure_ascii=False)

            messagebox.showinfo(
                "Éxito",
                f"Coordenadas guardadas en config.json\n\n"
                f"top={int(self.rect_y)}, left={int(self.rect_x)}, "
                f"width={int(self.rect_w)}, height={int(self.rect_h)}\n\n"
                "Reinicia ojo.py para aplicar cambios."
            )

        except Exception as e:
            messagebox.showerror("Error", f"No se pudo guardar en config.json:\n{str(e)}")
    
    def run(self):
        """Inicia la aplicación"""
        print("="*50)
        print("  HADES CALIBRADOR v1.0")
        print("="*50)
        print("Controles:")
        print("  - Arrastra dentro del rectángulo: Mover")
        print("  - Arrastra bordes/esquinas: Redimensionar")
        print("  - F5: Copiar coordenadas")
        print("  - ESC: Salir")
        print("="*50)
        
        self.root.mainloop()


if __name__ == "__main__":
    # Verificar dependencias
    try:
        import mss
        import cv2
        import numpy
        import pytesseract
        import pyperclip
    except ImportError as e:
        print(f"Error: Falta dependencia {e.name}")
        print("Instala con: pip install mss opencv-python numpy pytesseract pyperclip")
        input("Presiona Enter para salir...")
        exit(1)
    
    app = CalibradorHades()
    app.run()
