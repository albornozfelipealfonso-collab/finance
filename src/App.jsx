import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  PlusCircle, 
  MinusCircle,
  Eye,
  EyeOff,
  Zap,
  Target,
  Calendar,
  Download,
  Bell,
  ShoppingCart,
  Car,
  Film,
  MoreHorizontal,
  Filter,
  Plus,
  X,
  Tag,
  ChevronLeft,
  ChevronRight,
  Clock
} from 'lucide-react';

// AdMob para Capacitor
let AdMob;
let BannerAdSize, BannerAdPosition, RewardAdPluginEvents;

// Importar dinámicamente solo en entorno móvil
const initAdMob = async () => {
  try {
    const admobModule = await import('@capacitor-community/admob');
    AdMob = admobModule.AdMob;
    BannerAdSize = admobModule.BannerAdSize;
    BannerAdPosition = admobModule.BannerAdPosition;
    RewardAdPluginEvents = admobModule.RewardAdPluginEvents; // ← IMPORTANTE: Importar eventos
    return true;
  } catch (error) {
    console.log('AdMob no disponible en este entorno:', error);
    return false;
  }
};

// Storage simple que funciona en todos lados
const SimpleStorage = {
  setItem(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      console.log(`💾 Guardado: ${key}`);
    } catch (error) {
      console.error('Error guardando:', error);
    }
  },

  getItem(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error cargando:', error);
      return null;
    }
  },

  removeItem(key) {
    try {
      localStorage.removeItem(key);
      console.log(`🗑️ Eliminado: ${key}`);
    } catch (error) {
      console.error('Error eliminando:', error);
    }
  }
};

function App() {
  const [showBalances, setShowBalances] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [customCategories, setCustomCategories] = useState([
    'Alimentación', 'Transporte', 'Servicios', 'Entretenimiento'
  ]);
  const [incomeCategories, setIncomeCategories] = useState([
    'Salario', 'Freelance', 'Inversiones', 'Otros Ingresos'
  ]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [adFreeUntil, setAdFreeUntil] = useState(null);
  const [admobAvailable, setAdmobAvailable] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [newGoal, setNewGoal] = useState({
    name: '',
    targetAmount: '',
    currentAmount: 0,
    deadline: '',
    description: ''
  });

  const [newTransaction, setNewTransaction] = useState({
    type: 'expense',
    amount: '',
    category: '',
    description: ''
  });

  // IDs de AdMob - TUS IDs REALES DE PRODUCCIÓN
  const ADS = {
    banner: 'ca-app-pub-4367513013727409/5628738722',      // TU ID REAL BANNER
    interstitial: 'ca-app-pub-4367513013727409/8695731674', // TU ID REAL INTERSTICIAL
    rewarded: 'ca-app-pub-4367513013727409/9899156229'      // TU ID REAL RECOMPENSADO
  };

  // Inicializar AdMob y Storage al cargar la app
  useEffect(() => {
    initializeApp();
  }, []);

  // Guardar datos cuando cambien las transacciones
  useEffect(() => {
    if (dataLoaded && transactions.length > 0) {
      saveTransactions();
    }
  }, [transactions, dataLoaded]);

  // Guardar datos cuando cambien las categorías
  useEffect(() => {
    if (dataLoaded) {
      saveCategories();
    }
  }, [customCategories, incomeCategories, dataLoaded]);

  // Guardar estado ad-free
  useEffect(() => {
    if (dataLoaded) {
      saveAdFreeStatus();
    }
  }, [adFreeUntil, dataLoaded]);

  // Guardar metas de ahorro
  useEffect(() => {
    if (dataLoaded) {
      saveSavingsGoals();
    }
  }, [savingsGoals, dataLoaded]);

  // Mostrar intersticial cada 3 transacciones (CON OPCIÓN DE RECOMPENSA)
  useEffect(() => {
    if (admobAvailable && transactions.length > 0 && transactions.length % 3 === 0 && !isAdFree()) {
      // Mostrar opción: intersticial normal o recompensado
      setTimeout(() => {
        if (window.confirm('💰 ¿Prefieres ver un anuncio recompensado para ganar 2 horas sin ads? (Cancelar = anuncio normal)')) {
          showRewardedAd();
        } else {
          showInterstitialAd();
        }
      }, 1000); // Pequeño delay para mejor UX
    }
  }, [transactions.length, admobAvailable]);

  // Manejar banner según el estado ad-free
  useEffect(() => {
    if (admobAvailable) {
      if (!isAdFree()) {
        // Mostrar banner en todas las pestañas si no está ad-free
        showBannerAd();
      } else {
        // Ocultar banner si está ad-free
        hideBannerAd();
      }
    }
  }, [admobAvailable, adFreeUntil, activeTab]); // ← Agregué activeTab para re-evaluar

  // Función para verificar si está libre de anuncios
  const isAdFree = () => {
    if (!adFreeUntil) return false;
    const isFree = new Date() < new Date(adFreeUntil);
    if (isFree) {
      console.log('✨ Usuario está en modo ad-free hasta:', new Date(adFreeUntil).toLocaleTimeString());
    }
    return isFree;
  };

  // Inicializar toda la app
  const initializeApp = async () => {
    console.log('🚀 Inicializando FinanceFlow...');
    
    // Cargar datos guardados
    loadAllData();
    setDataLoaded(true);
    
    // Inicializar AdMob
    await initializeAdMob();
  };

  // Cargar todos los datos guardados
  const loadAllData = () => {
    try {
      console.log('📖 Cargando datos guardados...');
      
      // Cargar transacciones
      const savedTransactions = SimpleStorage.getItem('financeflow_transactions');
      if (savedTransactions && Array.isArray(savedTransactions)) {
        setTransactions(savedTransactions);
        console.log(`✅ ${savedTransactions.length} transacciones cargadas`);
      }
      
      // Cargar categorías de gastos
      const savedExpenseCategories = SimpleStorage.getItem('financeflow_expense_categories');
      if (savedExpenseCategories && Array.isArray(savedExpenseCategories)) {
        setCustomCategories(savedExpenseCategories);
        console.log(`✅ ${savedExpenseCategories.length} categorías de gastos cargadas`);
      }
      
      // Cargar categorías de ingresos
      const savedIncomeCategories = SimpleStorage.getItem('financeflow_income_categories');
      if (savedIncomeCategories && Array.isArray(savedIncomeCategories)) {
        setIncomeCategories(savedIncomeCategories);
        console.log(`✅ ${savedIncomeCategories.length} categorías de ingresos cargadas`);
      }
      
      // Cargar estado ad-free
      const savedAdFree = SimpleStorage.getItem('financeflow_adfree');
      if (savedAdFree) {
        const adFreeDate = new Date(savedAdFree);
        if (adFreeDate > new Date()) {
          setAdFreeUntil(adFreeDate);
          console.log('✅ Estado sin anuncios restaurado');
        }
      }

      // Cargar metas de ahorro
      const savedGoals = SimpleStorage.getItem('financeflow_savings_goals');
      if (savedGoals && Array.isArray(savedGoals)) {
        setSavingsGoals(savedGoals);
        console.log(`✅ ${savedGoals.length} metas de ahorro cargadas`);
      }
      
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
    }
  };

  // Guardar metas de ahorro
  const saveSavingsGoals = () => {
    try {
      SimpleStorage.setItem('financeflow_savings_goals', savingsGoals);
    } catch (error) {
      console.error('❌ Error guardando metas:', error);
    }
  };

  // Guardar transacciones
  const saveTransactions = () => {
    try {
      SimpleStorage.setItem('financeflow_transactions', transactions);
    } catch (error) {
      console.error('❌ Error guardando transacciones:', error);
    }
  };

  // Guardar categorías
  const saveCategories = () => {
    try {
      SimpleStorage.setItem('financeflow_expense_categories', customCategories);
      SimpleStorage.setItem('financeflow_income_categories', incomeCategories);
    } catch (error) {
      console.error('❌ Error guardando categorías:', error);
    }
  };

  // Guardar estado ad-free
  const saveAdFreeStatus = () => {
    try {
      if (adFreeUntil) {
        SimpleStorage.setItem('financeflow_adfree', adFreeUntil.toISOString());
      } else {
        SimpleStorage.removeItem('financeflow_adfree');
      }
    } catch (error) {
      console.error('❌ Error guardando estado ad-free:', error);
    }
  };

  // Calcular total ahorrado (suma de todas las metas)
  const totalSaved = savingsGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);

  // Calcular totales
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpenses - totalSaved;

  // Funciones para metas de ahorro
  const createSavingsGoal = () => {
    if (newGoal.name && newGoal.targetAmount) {
      const goal = {
        id: Math.max(...savingsGoals.map(g => g.id), 0) + 1,
        ...newGoal,
        targetAmount: parseFloat(newGoal.targetAmount),
        currentAmount: 0,
        createdAt: new Date().toISOString(),
        contributions: []
      };
      setSavingsGoals([...savingsGoals, goal]);
      setNewGoal({
        name: '',
        targetAmount: '',
        currentAmount: 0,
        deadline: '',
        description: ''
      });
    }
  };

  const addContribution = (goalId, amount) => {
    if (!amount || amount <= 0) return;
    
    const contributionAmount = parseFloat(amount);
    const currentBalance = totalIncome - totalExpenses - totalSaved;
    
    // Verificar que hay suficiente balance disponible
    if (contributionAmount > currentBalance) {
      alert(`No tienes suficiente balance disponible. Balance actual: ${formatCLP(currentBalance)}`);
      return;
    }
    
    setSavingsGoals(prevGoals => 
      prevGoals.map(goal => 
        goal.id === goalId 
          ? {
              ...goal,
              currentAmount: goal.currentAmount + contributionAmount,
              contributions: [
                ...goal.contributions,
                {
                  id: Date.now(),
                  amount: contributionAmount,
                  date: new Date().toISOString()
                }
              ]
            }
          : goal
      )
    );
  };

  const deleteGoal = (goalId) => {
    setSavingsGoals(prevGoals => prevGoals.filter(goal => goal.id !== goalId));
  };

  const getGoalProgress = (goal) => {
    return Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  };

  const getDaysRemaining = (deadline) => {
    if (!deadline) return null;
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const initializeAdMob = async () => {
    const isAvailable = await initAdMob();
    if (!isAvailable) {
      setAdmobAvailable(false);
      return;
    }

    try {
      await AdMob.initialize({
        requestTrackingAuthorization: true,
        testingDevices: [],
        initializeForTesting: false,
      });

      try {
        await AdMob.requestConsentInfo({
          debugGeography: 'DISABLED',
          testDeviceIdentifiers: []
        });
      } catch (consentError) {
        console.log('Consentimiento no requerido o error:', consentError);
      }
      
      setAdmobAvailable(true);
      console.log('✅ AdMob inicializado correctamente');
      
      // *** CONFIGURAR LISTENERS GLOBALES UNA SOLA VEZ ***
      console.log('🎧 Configurando listeners de recompensa...');
      
      // Listener para cuando se carga el anuncio
      AdMob.addListener(RewardAdPluginEvents.Loaded, (info) => {
        console.log('📥 Anuncio recompensado cargado:', JSON.stringify(info));
      });

      // Listener para cuando se muestra el anuncio
      AdMob.addListener(RewardAdPluginEvents.Showed, () => {
        console.log('📺 Anuncio recompensado mostrado - El usuario puede verlo');
      });

      // Listener para recompensas
      AdMob.addListener(RewardAdPluginEvents.Rewarded, (reward) => {
        console.log('🏆 ¡RECOMPENSA OFICIAL RECIBIDA!:', JSON.stringify(reward));
        
        // Otorgar 2 horas sin anuncios
        const freeUntil = new Date(Date.now() + 2 * 60 * 60 * 1000);
        setAdFreeUntil(freeUntil);
        
        console.log('✅ Recompensa de 2 horas sin ads otorgada');
        alert('🎉 ¡Excelente! Has ganado 2 horas sin anuncios');
      });

      // Listener para cuando se cierra el anuncio (CON O SIN RECOMPENSA)
      AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
        console.log('❌ Anuncio recompensado cerrado por el usuario');
        
        // Ocultar banner solo si el usuario está ad-free
        setTimeout(() => {
          if (isAdFree()) {
            hideBannerAd();
          }
        }, 500);
        
        // Pre-cargar siguiente anuncio
        setTimeout(() => {
          prepareRewardedAds();
        }, 2000);
      });

      // Listener para errores al mostrar
      AdMob.addListener(RewardAdPluginEvents.FailedToShow, (error) => {
        console.error('❌ Error mostrando anuncio recompensado:', error);
        alert('❌ Error mostrando el anuncio. Intenta nuevamente.');
      });

      // Listener para errores al cargar
      AdMob.addListener(RewardAdPluginEvents.FailedToLoad, (error) => {
        console.error('❌ Error cargando anuncio recompensado:', error);
      });

      console.log('✅ Listeners de AdMob configurados correctamente');
      
      // Pre-cargar anuncios recompensados después de inicializar
      setTimeout(() => {
        prepareRewardedAds();
      }, 3000);
      
    } catch (error) {
      console.error('❌ Error inicializando AdMob:', error);
      setAdmobAvailable(false);
    }
  };

  // Función auxiliar: Preparar anuncios al inicio
  const prepareRewardedAds = async () => {
    if (!admobAvailable) return;
    
    try {
      console.log('🎬 Pre-cargando anuncios recompensados...');
      const options = {
        adId: ADS.rewarded,
        isTesting: false,
      };
      
      await AdMob.prepareRewardVideoAd(options);
      console.log('✅ Anuncios recompensados pre-cargados');
    } catch (error) {
      console.log('⚠️ No se pudieron pre-cargar anuncios:', error);
    }
  };

  const showBannerAd = async () => {
    if (!admobAvailable || isAdFree() || bannerVisible) return;
    
    try {
      const options = {
        adId: ADS.banner,
        adSize: BannerAdSize.BANNER,
        position: BannerAdPosition.TOP_CENTER,
        margin: 0,
        isTesting: false,
      };

      await AdMob.showBanner(options);
      setBannerVisible(true);
      console.log('✅ Banner mostrado');
    } catch (error) {
      console.error('❌ Error mostrando banner:', error);
    }
  };

  const hideBannerAd = async () => {
    if (!admobAvailable || !bannerVisible) return;
    
    try {
      await AdMob.hideBanner();
      setBannerVisible(false);
      console.log('✅ Banner ocultado');
    } catch (error) {
      console.error('❌ Error ocultando banner:', error);
      // Forzar el estado aunque haya error
      setBannerVisible(false);
    }
  };

  const showInterstitialAd = async () => {
    if (!admobAvailable || isAdFree()) return;

    try {
      const options = {
        adId: ADS.interstitial,
        isTesting: false,
      };

      await AdMob.prepareInterstitial(options);
      await AdMob.showInterstitial();
      console.log('✅ Intersticial mostrado');
    } catch (error) {
      console.error('❌ Error mostrando intersticial:', error);
    }
  };

  const showRewardedAd = async () => {
    if (!admobAvailable) {
      alert('Los anuncios no están disponibles en este momento');
      return;
    }

    console.log('🎁 Iniciando anuncio recompensado...');

    try {
      const options = {
        adId: ADS.rewarded,
        isTesting: false,
      };

      // PASO 1: Verificar si hay anuncio disponible primero
      console.log('🔍 Verificando disponibilidad de anuncio...');
      
      try {
        // Intentar preparar el anuncio con timeout
        const preparePromise = AdMob.prepareRewardVideoAd(options);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout preparando anuncio')), 10000)
        );
        
        await Promise.race([preparePromise, timeoutPromise]);
        console.log('✅ Anuncio preparado correctamente');
        
      } catch (prepareError) {
        console.error('❌ Error preparando anuncio:', prepareError);
        
        if (prepareError.message?.includes('Timeout')) {
          alert('⏰ El anuncio tardó demasiado en cargar. Intenta nuevamente.');
        } else if (prepareError.message?.includes('not available') || prepareError.message?.includes('no fill')) {
          alert('📺 No hay anuncios disponibles en este momento. Intenta más tarde.');
        } else {
          alert('❌ Error preparando el anuncio. Verifica tu conexión.');
        }
        return;
      }

      // PASO 2: Mostrar anuncio con timeout de seguridad
      console.log('📺 Mostrando anuncio recompensado...');
      
      try {
        // Mostrar anuncio con timeout de seguridad
        const showPromise = AdMob.showRewardVideoAd();
        const safetyTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Anuncio no respondió')), 60000) // 60 segundos
        );
        
        const result = await Promise.race([showPromise, safetyTimeout]);
        console.log('🎭 Anuncio mostrado exitosamente:', JSON.stringify(result));
        
      } catch (showError) {
        console.error('❌ Error mostrando anuncio:', showError);
        
        if (showError.message?.includes('dismissed') || showError.message?.includes('cancelled')) {
          console.log('ℹ️ Usuario cerró el anuncio (normal)');
        } else if (showError.message?.includes('no respondió')) {
          alert('⚠️ El anuncio no responde. Reinicia la app si el problema persiste.');
          // Intentar limpiar el estado
          try {
            await AdMob.prepareRewardVideoAd(options);
          } catch (e) {
            console.log('No se pudo limpiar el estado del anuncio');
          }
        } else {
          alert('❌ Error mostrando el anuncio. Intenta nuevamente.');
        }
        return;
      }

    } catch (error) {
      console.error('❌ Error general en anuncio recompensado:', error);
      alert('❌ Error inesperado. Intenta nuevamente.');
    }

    // PASO 3: Pre-cargar siguiente anuncio después de un delay
    setTimeout(async () => {
      try {
        console.log('🔄 Pre-cargando siguiente anuncio...');
        await AdMob.prepareRewardVideoAd(options);
        console.log('✅ Siguiente anuncio preparado');
      } catch (prepError) {
        console.log('⚠️ No se pudo pre-cargar siguiente anuncio:', prepError);
      }
    }, 5000); // Esperar 5 segundos antes de pre-cargar
  };

  // Datos para gráficos (generados dinámicamente)
  const generateMonthlyData = () => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul'];
    const currentMonth = new Date().getMonth();
    
    return months.map((month, index) => {
      if (index > currentMonth) {
        return { month, income: 0, expenses: 0 };
      }
      
      // Calcular datos reales basados en las transacciones
      const monthTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate.getMonth() === index;
      });
      
      const income = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const expenses = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      
      return { month, income, expenses };
    });
  };

  const monthlyData = generateMonthlyData();

  // Colores para el gráfico de pie
  const COLORS = ['#06d6a0', '#f72585', '#4361ee', '#f77f00', '#fcbf49'];

  // Generar datos de categorías de gastos para el pie chart
  const generateExpenseCategories = () => {
    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    const categories = {};
    
    expenseTransactions.forEach(expense => {
      if (categories[expense.category]) {
        categories[expense.category] += expense.amount;
      } else {
        categories[expense.category] = expense.amount;
      }
    });
    
    return Object.entries(categories).map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index % COLORS.length]
    }));
  };

  const expenseCategories = generateExpenseCategories();

  // Función para formatear pesos chilenos
  const formatCLP = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Calcular gastos por categoría
  const getExpensesByCategory = () => {
    const expenses = transactions.filter(t => t.type === 'expense');
    const categories = {};
    
    expenses.forEach(expense => {
      if (categories[expense.category]) {
        categories[expense.category] += expense.amount;
      } else {
        categories[expense.category] = expense.amount;
      }
    });
    
    return Object.entries(categories).map(([name, amount]) => ({
      name,
      amount,
      count: expenses.filter(e => e.category === name).length
    }));
  };

  // Obtener transacciones por categoría
  const getTransactionsByCategory = (category) => {
    if (category === 'all') {
      return transactions.filter(t => t.type === 'expense');
    }
    return transactions.filter(t => t.type === 'expense' && t.category === category);
  };

  const categoryData = getExpensesByCategory();

  const addCategory = () => {
    if (newCategoryName.trim() && !customCategories.includes(newCategoryName.trim())) {
      setCustomCategories([...customCategories, newCategoryName.trim()]);
      setNewCategoryName('');
    }
  };

  const addIncomeCategory = (categoryName) => {
    if (categoryName.trim() && !incomeCategories.includes(categoryName.trim())) {
      setIncomeCategories([...incomeCategories, categoryName.trim()]);
    }
  };

  const deleteCategory = (categoryToDelete) => {
    const hasTransactions = transactions.some(t => t.category === categoryToDelete);
    if (hasTransactions) {
      alert('No puedes eliminar una categoría que tiene transacciones registradas.');
      return;
    }
    setCustomCategories(customCategories.filter(cat => cat !== categoryToDelete));
  };

  const addTransaction = () => {
    if (newTransaction.amount && newTransaction.category) {
      if (newTransaction.type === 'expense' && !customCategories.includes(newTransaction.category)) {
        setCustomCategories([...customCategories, newTransaction.category]);
      } else if (newTransaction.type === 'income' && !incomeCategories.includes(newTransaction.category)) {
        setIncomeCategories([...incomeCategories, newTransaction.category]);
      }
      
      const transaction = {
        id: Math.max(...transactions.map(t => t.id), 0) + 1,
        ...newTransaction,
        amount: parseFloat(newTransaction.amount),
        date: new Date().toISOString().split('T')[0]
      };
      setTransactions([transaction, ...transactions]);
      setNewTransaction({ type: 'expense', amount: '', category: '', description: '' });
      setShowCustomInput(false);
    }
  };

  const handleQuickAction = (action) => {
    switch(action) {
      case 'income':
        setActiveTab('transactions');
        setNewTransaction({ type: 'income', amount: '', category: '', description: '' });
        break;
      case 'expense':
        setActiveTab('transactions');
        setNewTransaction({ type: 'expense', amount: '', category: '', description: '' });
        break;
      case 'export':
        const data = JSON.stringify(transactions, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'finanzas-datos.json';
        a.click();
        break;
      case 'calendar':
        setActiveTab('calendario');
        break;
      case 'savings':
        setActiveTab('metas');
        break;
      default:
        break;
    }
  };

  // Funciones del calendario
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getTransactionsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return transactions.filter(t => t.date === dateStr);
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSameDay = (date1, date2) => {
    if (!date1 || !date2) return false;
    return date1.toDateString() === date2.toDateString();
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Mostrar pantalla de carga mientras se inicializa
  if (!dataLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-cyan-900 flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center mb-6">
          <DollarSign className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-4">FinanceFlow</h1>
        <div className="flex items-center space-x-2 text-gray-300">
          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse delay-75"></div>
          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse delay-150"></div>
        </div>
        <p className="text-gray-400 text-sm mt-4">Cargando tus datos...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-cyan-900 flex flex-col">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-md border-b border-white/10 sticky top-0 z-50 flex-shrink-0">
        <div className="w-full px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-shrink-0">
              <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg font-bold text-white whitespace-nowrap">FinanceFlow</h1>
              {/* Indicador de AdMob */}
              {admobAvailable && (
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                  ADS ✓
                </span>
              )}
            </div>

            <div className="flex items-center space-x-1 flex-shrink-0">
              <button
                onClick={() => setShowBalances(!showBalances)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300 min-h-[36px] min-w-[36px]"
              >
                {showBalances ? <Eye className="w-4 h-4 text-white" /> : <EyeOff className="w-4 h-4 text-white" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 w-full px-4 py-4 overflow-auto pb-24 pt-20">
        {activeTab === 'dashboard' && (
          <div className="space-y-4 w-full">
            {/* Notificación de estado sin anuncios */}
            {isAdFree() && (
              <div className="bg-green-500/20 border border-green-500/40 rounded-xl p-4 text-center">
                <h3 className="text-green-400 font-bold text-sm">
                  ✨ Sin anuncios hasta {new Date(adFreeUntil).toLocaleTimeString()}
                </h3>
              </div>
            )}

            {/* Info de AdMob para desarrollo */}
            {!admobAvailable && (
              <div className="bg-orange-500/20 border border-orange-500/40 rounded-xl p-4 text-center">
                <h3 className="text-orange-400 font-bold text-sm mb-2">
                  🔧 Modo Desarrollo
                </h3>
                <p className="text-orange-300 text-xs mb-2">
                  AdMob se activará cuando compiles para Android
                </p>
                <p className="text-green-300 text-xs mb-2">
                  ✅ Almacenamiento activo - Los datos se guardan automáticamente
                </p>
                <p className="text-cyan-300 text-xs">
                  💰 Los anuncios recompensados aparecerán automáticamente cada 3 transacciones
                </p>
              </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  title: 'Balance Disponible',
                  value: balance,
                  icon: Wallet,
                  color: 'from-emerald-500 to-teal-600',
                  change: balance >= 0 ? '+' : '',
                  subtitle: totalSaved > 0 ? `(${formatCLP(totalSaved)} en metas)` : ''
                },
                {
                  title: 'Ingresos',
                  value: totalIncome,
                  icon: TrendingUp,
                  color: 'from-cyan-500 to-blue-600',
                  change: '+100%'
                },
                {
                  title: 'Gastos',
                  value: totalExpenses,
                  icon: TrendingDown,
                  color: 'from-orange-500 to-red-600',
                  change: '-' + Math.round((totalExpenses / (totalIncome || 1)) * 100) + '%'
                },
                {
                  title: 'Ahorros',
                  value: totalSaved,
                  icon: Target,
                  color: 'from-violet-500 to-purple-600',
                  change: savingsGoals.length > 0 ? `${savingsGoals.length} metas` : '+0%'
                }
              ].map((card, index) => (
                <div 
                  key={index}
                  className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-all duration-300 group hover:scale-105"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 bg-gradient-to-r ${card.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <card.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-green-400 text-xs font-medium">{card.change}</span>
                  </div>
                  <h3 className="text-gray-300 text-xs mb-2">
                    {card.title}
                    {card.subtitle && <div className="text-gray-400 text-xs mt-1">{card.subtitle}</div>}
                  </h3>
                  <p className="text-white text-lg font-bold leading-tight">
                    {showBalances ? formatCLP(Math.round(card.value)) : '••••••'}
                  </p>
                </div>
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 gap-4">
              {/* Income vs Expenses Chart */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 w-full">
                <h3 className="text-white text-base font-semibold mb-4 flex items-center">
                  <Zap className="w-4 h-4 mr-2 text-cyan-400" />
                  Ingresos vs Gastos
                </h3>
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                      <YAxis stroke="#9CA3AF" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151', 
                          borderRadius: '12px',
                          color: '#F9FAFB',
                          fontSize: '14px'
                        }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="income" 
                        stroke="#06d6a0" 
                        strokeWidth={2}
                        dot={{ fill: '#06d6a0', strokeWidth: 2, r: 3 }}
                        activeDot={{ r: 5, stroke: '#06d6a0', strokeWidth: 2 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="expenses" 
                        stroke="#f72585" 
                        strokeWidth={2}
                        dot={{ fill: '#f72585', strokeWidth: 2, r: 3 }}
                        activeDot={{ r: 5, stroke: '#f72585', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Expense Categories */}
              {expenseCategories.length > 0 && (
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 w-full">
                  <h3 className="text-white text-base font-semibold mb-4 flex items-center">
                    <Target className="w-4 h-4 mr-2 text-violet-400" />
                    Categorías de Gastos
                  </h3>
                  <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expenseCategories}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {expenseCategories.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1F2937', 
                            border: '1px solid #374151', 
                            borderRadius: '12px',
                            color: '#F9FAFB',
                            fontSize: '14px'
                          }} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
              <h3 className="text-white text-lg font-semibold mb-4">Acciones Rápidas</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { icon: PlusCircle, label: 'Agregar Ingreso', color: 'from-emerald-500 to-teal-600', action: 'income' },
                  { icon: MinusCircle, label: 'Registrar Gasto', color: 'from-orange-500 to-red-600', action: 'expense' },
                  { icon: Download, label: 'Exportar Datos', color: 'from-cyan-500 to-blue-600', action: 'export' },
                  { icon: Calendar, label: 'Ver Calendario', color: 'from-violet-500 to-purple-600', action: 'calendar' }
                ].map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickAction(action.action)}
                    className={`bg-gradient-to-r ${action.color} rounded-xl p-3 flex flex-col items-center text-white hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl min-h-[80px] active:scale-95`}
                  >
                    <action.icon className="w-6 h-6 mb-2" />
                    <span className="text-xs font-medium text-center leading-tight">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mensaje de bienvenida si no hay transacciones */}
            {transactions.length === 0 && (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20 text-center">
                <DollarSign className="w-16 h-16 mx-auto mb-4 text-cyan-400" />
                <h3 className="text-white text-xl font-bold mb-2">¡Bienvenido a FinanceFlow!</h3>
                <p className="text-gray-300 mb-6">Comienza a gestionar tus finanzas personales de manera inteligente</p>
                <button
                  onClick={() => setActiveTab('transactions')}
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg px-6 py-3 text-white font-medium hover:from-cyan-600 hover:to-blue-600 transition-all duration-300"
                >
                  Agregar mi primera transacción
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="space-y-4 w-full">
            {/* Add Transaction Form */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
              <h3 className="text-white text-lg font-semibold mb-4">Nueva Transacción</h3>
              <div className="space-y-4">
                <select 
                  value={newTransaction.type}
                  onChange={(e) => setNewTransaction({...newTransaction, type: e.target.value})}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white text-base min-h-[48px]"
                >
                  <option value="expense">Gasto</option>
                  <option value="income">Ingreso</option>
                </select>
                
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="Monto"
                  value={newTransaction.amount}
                  onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 text-base min-h-[48px]"
                />
                
                <div className="relative">
                  <select
                    value={newTransaction.category}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setShowCustomInput(true);
                        setNewTransaction({...newTransaction, category: ''});
                      } else {
                        setShowCustomInput(false);
                        setNewTransaction({...newTransaction, category: e.target.value});
                      }
                    }}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white text-base min-h-[48px]"
                  >
                    <option value="">
                      Seleccionar categoría
                    </option>
                    {(newTransaction.type === 'expense' ? customCategories : incomeCategories).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="custom">+ Nueva categoría</option>
                  </select>
                  
                  {showCustomInput && (
                    <div className="absolute top-full left-0 right-0 mt-2 flex gap-2 z-10">
                      <input
                        type="text"
                        placeholder={`Nueva categoría de ${newTransaction.type === 'expense' ? 'gasto' : 'ingreso'}`}
                        value={newTransaction.category}
                        onChange={(e) => setNewTransaction({...newTransaction, category: e.target.value})}
                        className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 text-base min-h-[48px]"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newTransaction.category.trim()) {
                            if (newTransaction.type === 'expense') {
                              if (!customCategories.includes(newTransaction.category.trim())) {
                                setCustomCategories([...customCategories, newTransaction.category.trim()]);
                              }
                            } else {
                              if (!incomeCategories.includes(newTransaction.category.trim())) {
                                setIncomeCategories([...incomeCategories, newTransaction.category.trim()]);
                              }
                            }
                            setNewTransaction({...newTransaction, category: newTransaction.category.trim()});
                          }
                          setShowCustomInput(false);
                        }}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-3 rounded-lg min-h-[48px] min-w-[48px]"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomInput(false);
                          setNewTransaction({...newTransaction, category: ''});
                        }}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-3 rounded-lg min-h-[48px] min-w-[48px]"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
                
                <input
                  type="text"
                  placeholder="Descripción (opcional)"
                  value={newTransaction.description}
                  onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 text-base min-h-[48px]"
                />
                
                <button
                  onClick={addTransaction}
                  disabled={!newTransaction.amount || !newTransaction.category}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg px-6 py-4 text-white font-medium hover:from-cyan-600 hover:to-blue-600 transition-all duration-300 min-h-[48px] text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Agregar Transacción
                </button>
              </div>
            </div>

            {/* Transactions List */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden">
              <div className="p-6 border-b border-white/20">
                <h3 className="text-white text-lg font-semibold">Transacciones Recientes</h3>
              </div>
              <div className="divide-y divide-white/10">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="p-6 hover:bg-white/5 transition-colors duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          transaction.type === 'income' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {transaction.type === 'income' ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                        </div>
                        <div>
                          <h4 className="text-white font-medium">{transaction.category}</h4>
                          <p className="text-gray-400 text-sm">{transaction.description}</p>
                          <p className="text-gray-500 text-xs">{transaction.date}</p>
                        </div>
                      </div>
                      <div className={`text-right ${transaction.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                        <p className="font-semibold text-lg">
                          {transaction.type === 'income' ? '+' : '-'}{formatCLP(transaction.amount)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {transactions.length === 0 && (
                  <div className="p-8 text-center">
                    <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                    <p className="text-gray-400">No hay transacciones aún</p>
                    <p className="text-gray-500 text-sm">Agrega tu primera transacción para comenzar</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'categorías' && (
          <div className="space-y-4 w-full">
            {/* Gestión de categorías */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <h3 className="text-white text-lg font-semibold mb-6 flex items-center">
                <Tag className="w-5 h-5 mr-2 text-cyan-400" />
                Gestionar Categorías
              </h3>
              
              {/* Formulario para agregar categoría */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <input
                  type="text"
                  placeholder="Nombre de la nueva categoría"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400"
                  onKeyPress={(e) => e.key === 'Enter' && addCategory()}
                />
                <button
                  onClick={addCategory}
                  disabled={!newCategoryName.trim()}
                  className="bg-gradient-to-r from-orange-500 to-red-600 rounded-lg px-6 py-2 text-white font-medium hover:from-orange-600 hover:to-red-700 transition-all duration-300 flex items-center justify-center disabled:opacity-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Categoría de Gasto
                </button>
                <button
                  onClick={() => {
                    if (newCategoryName.trim() && !incomeCategories.includes(newCategoryName.trim())) {
                      setIncomeCategories([...incomeCategories, newCategoryName.trim()]);
                      setNewCategoryName('');
                    }
                  }}
                  disabled={!newCategoryName.trim()}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg px-6 py-2 text-white font-medium hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 flex items-center justify-center disabled:opacity-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Categoría de Ingreso
                </button>
              </div>

              {/* Categorías de Gastos */}
              <div className="mb-8">
                <h4 className="text-white font-medium mb-4 flex items-center">
                  <MinusCircle className="w-4 h-4 mr-2 text-red-400" />
                  Categorías de Gastos
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {customCategories.map((category, index) => {
                    const hasTransactions = transactions.some(t => t.category === category && t.type === 'expense');
                    return (
                      <div
                        key={category}
                        className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center justify-between group hover:bg-red-500/20 transition-all duration-200"
                      >
                        <span className="text-white">{category}</span>
                        <div className="flex items-center space-x-2">
                          {hasTransactions && (
                            <span className="text-xs text-red-400 bg-red-400/20 px-2 py-1 rounded">
                              En uso
                            </span>
                          )}
                          {!hasTransactions && (
                            <button
                              onClick={() => deleteCategory(category)}
                              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all duration-200"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Categorías de Ingresos */}
              <div>
                <h4 className="text-white font-medium mb-4 flex items-center">
                  <PlusCircle className="w-4 h-4 mr-2 text-green-400" />
                  Categorías de Ingresos
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {incomeCategories.map((category, index) => {
                    const hasTransactions = transactions.some(t => t.category === category && t.type === 'income');
                    return (
                      <div
                        key={category}
                        className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center justify-between group hover:bg-green-500/20 transition-all duration-200"
                      >
                        <span className="text-white">{category}</span>
                        <div className="flex items-center space-x-2">
                          {hasTransactions && (
                            <span className="text-xs text-green-400 bg-green-400/20 px-2 py-1 rounded">
                              En uso
                            </span>
                          )}
                          {!hasTransactions && (
                            <button
                              onClick={() => {
                                const hasIncomeTransactions = transactions.some(t => t.category === category && t.type === 'income');
                                if (hasIncomeTransactions) {
                                  alert('No puedes eliminar una categoría que tiene transacciones registradas.');
                                  return;
                                }
                                setIncomeCategories(incomeCategories.filter(cat => cat !== category));
                              }}
                              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all duration-200"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Header con filtros */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <Filter className="w-6 h-6 mr-2 text-cyan-400" />
                Gastos por Categoría
              </h2>
              {categoryData.length > 0 && (
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
                >
                  <option value="all">Todas las categorías</option>
                  {categoryData.map(cat => (
                    <option key={cat.name} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Cards de categorías */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categoryData.map((category, index) => {
                const getIcon = (categoryName) => {
                  const name = categoryName.toLowerCase();
                  if (name.includes('alimentación') || name.includes('comida')) return ShoppingCart;
                  if (name.includes('transporte') || name.includes('gasolina')) return Car;
                  if (name.includes('servicios') || name.includes('electricidad')) return Zap;
                  if (name.includes('entretenimiento') || name.includes('netflix')) return Film;
                  return MoreHorizontal;
                };
                
                const IconComponent = getIcon(category.name);
                const colors = [
                  'from-emerald-500 to-teal-600',
                  'from-orange-500 to-red-600', 
                  'from-violet-500 to-purple-600',
                  'from-cyan-500 to-blue-600',
                  'from-pink-500 to-rose-600'
                ];
                
                return (
                  <div 
                    key={category.name}
                    className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 group hover:scale-105 cursor-pointer"
                    onClick={() => setSelectedCategory(category.name)}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 bg-gradient-to-r ${colors[index % colors.length]} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-cyan-400 text-sm font-medium">{category.count} gastos</span>
                    </div>
                    <h3 className="text-gray-300 text-sm mb-2">{category.name}</h3>
                    <p className="text-white text-2xl font-bold">
                      {showBalances ? formatCLP(category.amount) : '••••••'}
                    </p>
                  </div>
                );
              })}
              {categoryData.length === 0 && (
                <div className="col-span-full text-center py-8">
                  <Tag className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                  <p className="text-gray-400">No hay gastos por categoría aún</p>
                  <p className="text-gray-500 text-sm">Agrega algunas transacciones para ver el análisis</p>
                </div>
              )}
            </div>

            {/* Lista detallada de transacciones */}
            {categoryData.length > 0 && (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden">
                <div className="p-6 border-b border-white/20">
                  <h3 className="text-white text-lg font-semibold">
                    {selectedCategory === 'all' 
                      ? 'Todas las Transacciones de Gastos' 
                      : `Gastos en ${selectedCategory}`
                    }
                  </h3>
                </div>
                <div className="divide-y divide-white/10 max-h-96 overflow-y-auto">
                  {getTransactionsByCategory(selectedCategory).map((transaction) => (
                    <div key={transaction.id} className="p-6 hover:bg-white/5 transition-colors duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-red-500/20 text-red-400">
                            <TrendingDown className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="text-white font-medium">{transaction.category}</h4>
                            <p className="text-gray-400 text-sm">{transaction.description}</p>
                            <p className="text-gray-500 text-xs">{transaction.date}</p>
                          </div>
                        </div>
                        <div className="text-right text-red-400">
                          <p className="font-semibold text-lg">
                            -{formatCLP(transaction.amount)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {getTransactionsByCategory(selectedCategory).length === 0 && (
                    <div className="p-8 text-center text-gray-400">
                      <MoreHorizontal className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No hay gastos en esta categoría</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'calendario' && (
          <div className="space-y-4 w-full">
            {/* Header del calendario */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center">
                  <Calendar className="w-6 h-6 mr-2 text-cyan-400" />
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => navigateMonth(-1)}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300"
                  >
                    <ChevronLeft className="w-5 h-5 text-white" />
                  </button>
                  <button
                    onClick={() => setCurrentDate(new Date())}
                    className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium transition-all duration-300"
                  >
                    Hoy
                  </button>
                  <button
                    onClick={() => navigateMonth(1)}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300"
                  >
                    <ChevronRight className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Días de la semana */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map(day => (
                  <div key={day} className="p-3 text-center text-gray-400 font-medium text-sm">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendario */}
              <div className="grid grid-cols-7 gap-1">
                {/* Días vacíos del mes anterior */}
                {Array.from({ length: getFirstDayOfMonth(currentDate) }, (_, i) => (
                  <div key={`empty-${i}`} className="p-3 h-20"></div>
                ))}
                
                {/* Días del mes actual */}
                {Array.from({ length: getDaysInMonth(currentDate) }, (_, i) => {
                  const day = i + 1;
                  const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                  const dayTransactions = getTransactionsForDate(date);
                  const totalIncome = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
                  const totalExpenses = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
                  const hasTransactions = dayTransactions.length > 0;
                  const isCurrentDay = isToday(date);
                  const isSelected = isSameDay(date, selectedDate);

                  return (
                    <div
                      key={day}
                      onClick={() => setSelectedDate(date)}
                      className={`p-2 h-20 border border-white/10 rounded-lg cursor-pointer transition-all duration-200 hover:bg-white/10 ${
                        isCurrentDay ? 'bg-cyan-500/20 border-cyan-500/40' : ''
                      } ${
                        isSelected ? 'bg-cyan-500/30 border-cyan-500/60' : ''
                      } ${
                        hasTransactions ? 'border-yellow-500/40' : ''
                      }`}
                    >
                      <div className="h-full flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                          <span className={`text-sm font-medium ${isCurrentDay ? 'text-cyan-200' : 'text-white'}`}>
                            {day}
                          </span>
                          {hasTransactions && (
                            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                          )}
                        </div>
                        
                        {hasTransactions && (
                          <div className="text-xs">
                            {totalIncome > 0 && (
                              <div className="text-green-400 truncate">+{formatCLP(totalIncome).slice(0, -3)}</div>
                            )}
                            {totalExpenses > 0 && (
                              <div className="text-red-400 truncate">-{formatCLP(totalExpenses).slice(0, -3)}</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Panel de detalles del día seleccionado */}
            {selectedDate && (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <h3 className="text-white text-lg font-semibold mb-4 flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-cyan-400" />
                  Transacciones del {selectedDate.getDate()} de {monthNames[selectedDate.getMonth()]}
                </h3>
                
                {getTransactionsForDate(selectedDate).length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                    <p className="text-gray-400">No hay transacciones en esta fecha</p>
                    <button
                      onClick={() => {
                        setActiveTab('transactions');
                        setNewTransaction({ 
                          type: 'expense', 
                          amount: '', 
                          category: '', 
                          description: ''
                        });
                      }}
                      className="mt-4 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg px-6 py-2 text-white font-medium hover:from-cyan-600 hover:to-blue-600 transition-all duration-300"
                    >
                      Agregar Transacción
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getTransactionsForDate(selectedDate).map((transaction) => (
                      <div key={transaction.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              transaction.type === 'income' 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {transaction.type === 'income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            </div>
                            <div>
                              <h4 className="text-white font-medium text-sm">{transaction.category}</h4>
                              <p className="text-gray-400 text-xs">{transaction.description}</p>
                            </div>
                          </div>
                          <div className={`text-right ${transaction.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                            <p className="font-semibold">
                              {transaction.type === 'income' ? '+' : '-'}{formatCLP(transaction.amount)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Resumen del día */}
                    <div className="mt-4 pt-4 border-t border-white/20">
                      {(() => {
                        const dayTransactions = getTransactionsForDate(selectedDate);
                        const dayIncome = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
                        const dayExpenses = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
                        const dayBalance = dayIncome - dayExpenses;
                        
                        return (
                          <div className="grid grid-cols-3 gap-4">
                            <div className="text-center">
                              <p className="text-green-400 font-semibold">{formatCLP(dayIncome)}</p>
                              <p className="text-gray-400 text-xs">Ingresos</p>
                            </div>
                            <div className="text-center">
                              <p className="text-red-400 font-semibold">{formatCLP(dayExpenses)}</p>
                              <p className="text-gray-400 text-xs">Gastos</p>
                            </div>
                            <div className="text-center">
                              <p className={`font-semibold ${dayBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {formatCLP(dayBalance)}
                              </p>
                              <p className="text-gray-400 text-xs">Balance</p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Vista resumen del mes */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <h3 className="text-white text-lg font-semibold mb-6 flex items-center">
                <Target className="w-5 h-5 mr-2 text-violet-400" />
                Resumen de {monthNames[currentDate.getMonth()]}
              </h3>
              
              {(() => {
                const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
                const monthTransactions = transactions.filter(t => {
                  const transactionDate = new Date(t.date);
                  return transactionDate >= monthStart && transactionDate <= monthEnd;
                });
                
                const monthIncome = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
                const monthExpenses = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
                const monthBalance = monthIncome - monthExpenses;
                const daysWithTransactions = new Set(monthTransactions.map(t => t.date)).size;
                
                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-green-500/10 rounded-lg p-4 text-center border border-green-500/20">
                      <p className="text-green-400 text-2xl font-bold">{formatCLP(monthIncome)}</p>
                      <p className="text-green-300 text-sm">Ingresos Totales</p>
                    </div>
                    <div className="bg-red-500/10 rounded-lg p-4 text-center border border-red-500/20">
                      <p className="text-red-400 text-2xl font-bold">{formatCLP(monthExpenses)}</p>
                      <p className="text-red-300 text-sm">Gastos Totales</p>
                    </div>
                    <div className={`rounded-lg p-4 text-center border ${monthBalance >= 0 ? 'bg-cyan-500/10 border-cyan-500/20' : 'bg-orange-500/10 border-orange-500/20'}`}>
                      <p className={`text-2xl font-bold ${monthBalance >= 0 ? 'text-cyan-400' : 'text-orange-400'}`}>
                        {formatCLP(monthBalance)}
                      </p>
                      <p className={`text-sm ${monthBalance >= 0 ? 'text-cyan-300' : 'text-orange-300'}`}>Balance</p>
                    </div>
                    <div className="bg-violet-500/10 rounded-lg p-4 text-center border border-violet-500/20">
                      <p className="text-violet-400 text-2xl font-bold">{daysWithTransactions}</p>
                      <p className="text-violet-300 text-sm">Días Activos</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {activeTab === 'metas' && (
          <div className="space-y-4 w-full">
            {/* Header de Metas */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                <Target className="w-6 h-6 mr-2 text-violet-400" />
                Metas de Ahorro
              </h2>
              
              {/* Resumen de ahorros */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-violet-500/10 rounded-lg p-4 text-center border border-violet-500/20">
                  <p className="text-violet-400 text-2xl font-bold">{formatCLP(totalSaved)}</p>
                  <p className="text-violet-300 text-sm">Total Ahorrado</p>
                </div>
                <div className="bg-cyan-500/10 rounded-lg p-4 text-center border border-cyan-500/20">
                  <p className="text-cyan-400 text-2xl font-bold">{savingsGoals.length}</p>
                  <p className="text-cyan-300 text-sm">Metas Activas</p>
                </div>
                <div className="bg-green-500/10 rounded-lg p-4 text-center border border-green-500/20">
                  <p className="text-green-400 text-2xl font-bold">
                    {savingsGoals.filter(g => getGoalProgress(g) >= 100).length}
                  </p>
                  <p className="text-green-300 text-sm">Completadas</p>
                </div>
                <div className="bg-orange-500/10 rounded-lg p-4 text-center border border-orange-500/20">
                  <p className="text-orange-400 text-2xl font-bold">
                    {formatCLP(savingsGoals.reduce((sum, g) => sum + g.targetAmount, 0))}
                  </p>
                  <p className="text-orange-300 text-sm">Meta Total</p>
                </div>
              </div>

              {/* Formulario para nueva meta */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h3 className="text-white text-lg font-semibold mb-4">Crear Nueva Meta</h3>
                
                {/* Información sobre el balance */}
                <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3 mb-4">
                  <p className="text-cyan-300 text-sm">
                    <strong>💡 Importante:</strong> El dinero ahorrado en metas se descuenta de tu balance disponible. 
                    Balance actual disponible para ahorros: <strong>{formatCLP(balance)}</strong>
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <input
                    type="text"
                    placeholder="Nombre de la meta"
                    value={newGoal.name}
                    onChange={(e) => setNewGoal({...newGoal, name: e.target.value})}
                    className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400"
                  />
                  <input
                    type="number"
                    placeholder="Monto objetivo"
                    value={newGoal.targetAmount}
                    onChange={(e) => setNewGoal({...newGoal, targetAmount: e.target.value})}
                    className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400"
                  />
                  <input
                    type="date"
                    value={newGoal.deadline}
                    onChange={(e) => setNewGoal({...newGoal, deadline: e.target.value})}
                    className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
                  />
                  <button
                    onClick={createSavingsGoal}
                    disabled={!newGoal.name || !newGoal.targetAmount}
                    className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg px-6 py-2 text-white font-medium hover:from-violet-600 hover:to-purple-700 transition-all duration-300 disabled:opacity-50"
                  >
                    Crear Meta
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Descripción (opcional)"
                  value={newGoal.description}
                  onChange={(e) => setNewGoal({...newGoal, description: e.target.value})}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 mt-4"
                />
              </div>
            </div>

            {/* Lista de Metas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {savingsGoals.map((goal) => {
                const progress = getGoalProgress(goal);
                const daysRemaining = getDaysRemaining(goal.deadline);
                const isCompleted = progress >= 100;
                const isOverdue = daysRemaining < 0;

                return (
                  <div key={goal.id} className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-white text-xl font-bold">{goal.name}</h3>
                      <button
                        onClick={() => deleteGoal(goal.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {goal.description && (
                      <p className="text-gray-300 text-sm mb-4">{goal.description}</p>
                    )}

                    {/* Progreso visual */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-300">Progreso</span>
                        <span className="text-white font-medium">{progress.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full transition-all duration-500 ${
                            isCompleted ? 'bg-green-500' : 'bg-gradient-to-r from-violet-500 to-purple-600'
                          }`}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Montos */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-gray-400 text-xs">Ahorrado</p>
                        <p className="text-white font-bold">{formatCLP(goal.currentAmount)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Meta</p>
                        <p className="text-white font-bold">{formatCLP(goal.targetAmount)}</p>
                      </div>
                    </div>

                    {/* Fecha límite */}
                    {goal.deadline && (
                      <div className="mb-4">
                        <p className="text-gray-400 text-xs">Fecha límite</p>
                        <p className={`text-sm font-medium ${
                          isOverdue ? 'text-red-400' : daysRemaining <= 30 ? 'text-orange-400' : 'text-gray-300'
                        }`}>
                          {new Date(goal.deadline).toLocaleDateString('es-CL')}
                          {daysRemaining !== null && (
                            <span className="ml-2">
                              ({daysRemaining > 0 ? `${daysRemaining} días restantes` : 
                                daysRemaining === 0 ? 'Vence hoy' : `${Math.abs(daysRemaining)} días vencida`})
                            </span>
                          )}
                        </p>
                      </div>
                    )}

                    {/* Estado de la meta */}
                    {isCompleted && (
                      <div className="bg-green-500/20 border border-green-500/40 rounded-lg p-3 mb-4">
                        <p className="text-green-400 font-medium text-sm">🎉 ¡Meta completada!</p>
                      </div>
                    )}

                    {/* Aportar dinero */}
                    {!isCompleted && (
                      <div>
                        <div className="text-xs text-gray-400 mb-2">
                          Balance disponible: {formatCLP(balance)}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            placeholder="Monto a aportar"
                            max={balance}
                            className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 text-sm"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                const amount = parseFloat(e.target.value);
                                if (amount > 0) {
                                  addContribution(goal.id, amount);
                                  e.target.value = '';
                                }
                              }
                            }}
                          />
                          <button
                            onClick={(e) => {
                              const input = e.target.parentElement.querySelector('input');
                              const amount = parseFloat(input.value);
                              if (amount > 0) {
                                addContribution(goal.id, amount);
                                input.value = '';
                              }
                            }}
                            className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg px-4 py-2 text-white font-medium hover:from-violet-600 hover:to-purple-700 transition-all duration-300 text-sm"
                          >
                            Aportar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Últimos aportes */}
                    {goal.contributions && goal.contributions.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <p className="text-gray-400 text-xs mb-2">Últimos aportes:</p>
                        <div className="space-y-1 max-h-20 overflow-y-auto">
                          {goal.contributions.slice(-3).reverse().map((contribution) => (
                            <div key={contribution.id} className="flex justify-between text-sm">
                              <span className="text-gray-300">
                                {new Date(contribution.date).toLocaleDateString('es-CL')}
                              </span>
                              <span className="text-green-400 font-medium">
                                +{formatCLP(contribution.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Mensaje si no hay metas */}
            {savingsGoals.length === 0 && (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20 text-center">
                <Target className="w-16 h-16 mx-auto mb-4 text-violet-400" />
                <h3 className="text-white text-xl font-bold mb-2">¡Crea tu primera meta de ahorro!</h3>
                <p className="text-gray-300 mb-6">Define objetivos específicos y ahorra de manera inteligente</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="text-violet-400 font-medium mb-2">🏠 Para el hogar</h4>
                    <p className="text-gray-400 text-sm">Electrodomésticos, muebles, decoración</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="text-green-400 font-medium mb-2">✈️ Vacaciones</h4>
                    <p className="text-gray-400 text-sm">Viajes, hoteles, experiencias</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="text-orange-400 font-medium mb-2">🚗 Transporte</h4>
                    <p className="text-gray-400 text-sm">Auto, moto, bicicleta</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navegación Inferior */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black/30 backdrop-blur-md border-t border-white/10 z-50">
        <div className="grid grid-cols-5 h-16">
          {[
            { key: 'dashboard', icon: Wallet, label: 'Inicio' },
            { key: 'transactions', icon: DollarSign, label: 'Trans.' },
            { key: 'categorías', icon: Tag, label: 'Categ.' },
            { key: 'calendario', icon: Calendar, label: 'Calen.' },
            { key: 'metas', icon: Target, label: 'Metas' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-col items-center justify-center transition-all duration-300 ${
                activeTab === tab.key 
                  ? 'text-cyan-400' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <tab.icon className={`w-5 h-5 mb-1 ${activeTab === tab.key ? 'scale-110' : ''} transition-transform duration-300`} />
              <span className="text-xs font-medium">{tab.label}</span>
              {activeTab === tab.key && (
                <div className="absolute bottom-0 w-8 h-0.5 bg-cyan-400 rounded-full"></div>
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default App;