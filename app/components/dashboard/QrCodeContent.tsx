"use client"

import { useState, useEffect } from "react"
import { QRCodeSVG } from "qrcode.react"

// Removemos a dependência do useAuthSession
const QRCodeContent = () => {
  const [cartao, setCartao] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Função para inicializar os dados do QR Code
    const initQrCode = () => {
      try {
        // Verificamos se há algum valor salvo no localStorage
        const storedUser = localStorage.getItem('qrcred_user')
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser)
            if (parsedUser.cartao) {
              setCartao(parsedUser.cartao)
              setIsLoading(false)
              return
            }
          } catch (error) {
            console.error('Erro ao processar dados do usuário:', error)
          }
        }
        
        // Fallback para um valor padrão (se não houver cartão no localStorage)
        setCartao("1184646067")
        setIsLoading(false)
      } catch (error) {
        console.error("Erro ao inicializar QR Code:", error)
        // Em caso de erro, ainda definimos um valor padrão
        setCartao("1184646067")
        setIsLoading(false)
      }
    }

    // Inicializa o componente
    initQrCode()
  }, [])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!cartao) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-red-500">Erro ao carregar o QR Code. Tente novamente.</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <QRCodeSVG value={cartao} size={256} level="H" includeMargin={true} />
      </div>
      
      <p className="text-sm text-gray-500 text-center">
        Apresente este QR Code no estabelecimento ou o número do cartão para realizar pagamentos
      </p>
      
      {/* Card separado para o número do cartão */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg shadow-lg w-full max-w-sm">
        <p className="text-white text-sm font-medium text-center mb-2">
          Seu número de cartão:
        </p>
        <p className="text-white text-3xl font-bold text-center tracking-wider">
          {cartao}
        </p>
      </div>
    </div>
  )
}

export default QRCodeContent

