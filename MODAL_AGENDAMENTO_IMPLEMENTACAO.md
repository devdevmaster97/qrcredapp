# ✅ Modal de Agendamento - Implementação Completa

## 🎯 Objetivo

Adicionar um modal para solicitar data e hora quando o usuário clicar no botão "Agendar" nos convênios.

## 📋 Requisitos

Quando o usuário clicar no botão "Agendar":
1. Abrir um modal solicitando data e hora do agendamento
2. Validar se data/hora não estão no passado
3. Enviar data/hora junto com os dados do agendamento para a API

## 🔧 Implementação

### **1. Imports Adicionados**
```typescript
import { FaCalendarAlt, FaClock, FaTimes } from 'react-icons/fa';
```

### **2. Estados Adicionados**
```typescript
// Estados para o modal de agendamento
const [modalAberto, setModalAberto] = useState(false);
const [profissionalSelecionado, setProfissionalSelecionado] = useState<ConvenioProfissional | null>(null);
const [dataAgendamento, setDataAgendamento] = useState('');
const [horaAgendamento, setHoraAgendamento] = useState('');
```

### **3. Funções Adicionadas**

#### **abrirModalAgendamento**
```typescript
const abrirModalAgendamento = (profissional: ConvenioProfissional) => {
  setProfissionalSelecionado(profissional);
  setDataAgendamento('');
  setHoraAgendamento('');
  setModalAberto(true);
};
```

#### **fecharModal**
```typescript
const fecharModal = () => {
  setModalAberto(false);
  setProfissionalSelecionado(null);
  setDataAgendamento('');
  setHoraAgendamento('');
};
```

#### **confirmarAgendamento**
```typescript
const confirmarAgendamento = async () => {
  if (!profissionalSelecionado) return;
  
  // Validar data e hora
  if (!dataAgendamento || !horaAgendamento) {
    toast.error('Por favor, informe a data e hora desejadas para o agendamento.');
    return;
  }
  
  // Validar se a data não é no passado
  const dataHoraAgendamento = new Date(`${dataAgendamento}T${horaAgendamento}`);
  const agora = new Date();
  
  if (dataHoraAgendamento < agora) {
    toast.error('A data e hora do agendamento não podem ser no passado.');
    return;
  }
  
  // Fechar modal e processar agendamento
  fecharModal();
  await handleAgendar(profissionalSelecionado, dataHoraAgendamento);
};
```

### **4. Modificação na função handleAgendar**

Adicionar parâmetro opcional `dataHoraAgendamento`:
```typescript
const handleAgendar = async (profissional: ConvenioProfissional, dataHoraAgendamento?: Date) => {
  // ... código existente ...
  
  // Preparar dados para o agendamento
  const agendamentoData: any = {
    cod_associado: associadoData.matricula,
    id_empregador: associadoData.empregador,
    cod_convenio: codigoConvenio,
    profissional: nomeProfissional,
    especialidade: especialidade,
    convenio_nome: convenio
  };
  
  // Adicionar data agendada se foi informada
  if (dataHoraAgendamento) {
    agendamentoData.data_agendada = dataHoraAgendamento.toISOString();
  }
  
  // ... resto do código ...
};
```

### **5. Modificação no Botão Agendar**

Alterar de:
```typescript
onClick={() => handleAgendar(prof)}
```

Para:
```typescript
onClick={() => abrirModalAgendamento(prof)}
```

### **6. Componente Modal**

Adicionar no final do return, antes do fechamento da div principal:

```tsx
{/* Modal de Agendamento */}
{modalAberto && profissionalSelecionado && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg max-w-md w-full p-6">
      {/* Cabeçalho do Modal */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <FaCalendarAlt className="mr-2 text-blue-500" />
          Agendar Consulta
        </h3>
        <button
          onClick={fecharModal}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <FaTimes className="w-5 h-5" />
        </button>
      </div>

      {/* Informações do Profissional */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">Profissional:</p>
        <p className="font-medium text-gray-900">
          {getStringValue(profissionalSelecionado.profissional)}
        </p>
        <p className="text-sm text-gray-600 mt-1">Especialidade:</p>
        <p className="font-medium text-gray-900">
          {getStringValue(profissionalSelecionado.especialidade)}
        </p>
      </div>

      {/* Campos de Data e Hora */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
            <FaCalendarAlt className="mr-2 text-blue-500" />
            Data do Agendamento
          </label>
          <input
            type="date"
            value={dataAgendamento}
            onChange={(e) => setDataAgendamento(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
            <FaClock className="mr-2 text-blue-500" />
            Hora do Agendamento
          </label>
          <input
            type="time"
            value={horaAgendamento}
            onChange={(e) => setHoraAgendamento(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="flex gap-3">
        <button
          onClick={fecharModal}
          className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={confirmarAgendamento}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Confirmar
        </button>
      </div>
    </div>
  </div>
)}
```

## ✅ Resultado Final

Quando o usuário clicar em "Agendar":
1. ✅ Modal abre solicitando data e hora
2. ✅ Validação impede datas/horas no passado
3. ✅ Data mínima configurada para hoje
4. ✅ Dados enviados para API incluem `data_agendada` em formato ISO
5. ✅ Modal fecha após confirmação
6. ✅ Agendamento processado normalmente

## 📝 Observações

- O campo `data_agendada` é opcional na API
- Se não informado, o agendamento é criado sem data específica
- A validação garante que apenas datas futuras sejam aceitas
- O modal é responsivo e funciona em mobile e desktop

---

**Status:** Pronto para implementação
