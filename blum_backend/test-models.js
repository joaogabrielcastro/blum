require('dotenv').config();

async function listAvailableModels() {
  try {
    console.log('🔍 Testando conexão com a API Gemini...');
    console.log('Chave API:', process.env.GEMINI_API_KEY ? '✅ Presente' : '❌ Ausente');
    
    const response = await fetch('https://generativelanguage.googleapis.com/v1/models?key=' + process.env.GEMINI_API_KEY);
    
    console.log('Status da resposta:', response.status);
    
    if (!response.ok) {
      throw new Error('HTTP error! status: ' + response.status);
    }
    
    const data = await response.json();
    console.log('\n✅ MODELOS DISPONÍVEIS:');
    console.log('='.repeat(50));
    
    if (data.models && data.models.length > 0) {
      data.models.forEach(model => {
        console.log('📦 Nome:', model.name);
        console.log('📝 Descrição:', model.description);
        console.log('⚡ Métodos:', model.supportedGenerationMethods?.join(', ') || 'Nenhum');
        console.log('-'.repeat(30));
      });
    } else {
      console.log('❌ Nenhum modelo encontrado');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

listAvailableModels();
