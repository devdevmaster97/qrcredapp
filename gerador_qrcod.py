import qrcode
url = "https://sasapp.tec.br"
img = qrcode.make(url)
img.save("sasapp_tec_br_qr.png")