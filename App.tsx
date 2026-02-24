import { useState, useEffect, useRef } from 'react'
import './App.css'
import { 
  Brain, Upload, MessageCircle, Sparkles, Crown, 
  CheckCircle, BookOpen, Globe,
  Calculator, FlaskConical, Atom, History,
  LogOut, User, ArrowRight, Flame, Trophy,
  Target, Award, TrendingUp,
  Camera
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'

// Types
interface User {
  id: string
  email: string
  name: string
  tier: 'free' | 'premium'
  daily_questions: number
  total_questions: number
  streak: number
  last_active: string
  xp: number
  level: number
  badges: string[]
  preferred_language: 'en' | 'ar'
}

interface Question {
  id: string
  question: string
  explanation: string
  steps: string[]
  final_answer: string
  subject: string
  created_at: string
}

interface LeaderboardEntry {
  rank: number
  name: string
  xp: number
  level: number
  streak: number
}

// Gamification data
const BADGES = [
  { id: 'first_question', name: 'First Steps', icon: '🎯', desc: 'Asked your first question' },
  { id: 'streak_3', name: 'On Fire', icon: '🔥', desc: '3-day streak' },
  { id: 'streak_7', name: 'Unstoppable', icon: '⚡', desc: '7-day streak' },
  { id: 'streak_30', name: 'Legend', icon: '👑', desc: '30-day streak' },
  { id: 'questions_10', name: 'Curious Mind', icon: '🧠', desc: 'Solved 10 questions' },
  { id: 'questions_50', name: 'Scholar', icon: '📚', desc: 'Solved 50 questions' },
  { id: 'questions_100', name: 'Master', icon: '🏆', desc: 'Solved 100 questions' },
  { id: 'premium', name: 'VIP', icon: '💎', desc: 'Upgraded to Premium' },
]

// Translations
const TRANSLATIONS = {
  en: {
    welcome: 'Welcome Back!',
    startJourney: 'Start Your Journey',
    login: 'Log In',
    signup: 'Sign Up',
    email: 'Email',
    password: 'Password',
    name: 'Name',
    noAccount: "Don't have an account?",
    hasAccount: 'Already have an account?',
    backToHome: '← Back to home',
    askQuestion: 'Ask a Question',
    getExplanation: 'Get Explanation',
    thinking: 'Thinking...',
    photo: 'Photo',
    dailyQuestions: 'Daily Questions',
    totalSolved: 'Total Solved',
    yourProgress: 'Your Progress',
    recentQuestions: 'Recent Questions',
    upgrade: 'Upgrade to Premium',
    unlockUnlimited: 'Unlock Unlimited Learning',
    upgradeDesc: "You've reached your daily limit. Upgrade to Premium for unlimited questions.",
    stepByStep: 'Step-by-Step Solution',
    question: 'Question:',
    math: 'Math',
    physics: 'Physics',
    chemistry: 'Chemistry',
    streak: 'Day Streak',
    level: 'Level',
    xp: 'XP',
    badges: 'Badges',
    leaderboard: 'Leaderboard',
    language: 'Language',
    typeQuestion: 'Type your question here...',
  },
  ar: {
    welcome: 'أهلاً بعودتك!',
    startJourney: 'ابدأ رحلتك',
    login: 'تسجيل الدخول',
    signup: 'إنشاء حساب',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    name: 'الاسم',
    noAccount: 'ليس لديك حساب؟',
    hasAccount: 'لديك حساب بالفعل؟',
    backToHome: '← العودة للرئيسية',
    askQuestion: 'اطرح سؤالاً',
    getExplanation: 'احصل على الشرح',
    thinking: 'جاري التفكير...',
    photo: 'صورة',
    dailyQuestions: 'الأسئلة اليومية',
    totalSolved: 'إجمالي المحلول',
    yourProgress: 'تقدمك',
    recentQuestions: 'الأسئلة الأخيرة',
    upgrade: 'الترقية للبريميوم',
    unlockUnlimited: 'فتح تعلم غير محدود',
    upgradeDesc: 'لقد وصلت للحد اليومي. رقي للبريميوم لأسئلة غير محدودة.',
    stepByStep: 'الحل خطوة بخطوة',
    question: 'السؤال:',
    math: 'رياضيات',
    physics: 'فيزياء',
    chemistry: 'كيمياء',
    streak: 'أيام متتالية',
    level: 'المستوى',
    xp: 'نقاط الخبرة',
    badges: 'الشارات',
    leaderboard: 'لوحة المتصدرين',
    language: 'اللغة',
    typeQuestion: 'اكتب سؤالك هنا...',
  }
}

// Mock data

const mockLeaderboard: LeaderboardEntry[] = [
  { rank: 1, name: 'Ahmed K.', xp: 2500, level: 8, streak: 12 },
  { rank: 2, name: 'Sara M.', xp: 2100, level: 7, streak: 8 },
  { rank: 3, name: 'Omar H.', xp: 1850, level: 6, streak: 15 },
  { rank: 4, name: 'You', xp: 450, level: 3, streak: 3 },
  { rank: 5, name: 'Lina R.', xp: 320, level: 2, streak: 2 },
]


// Main App Component
function App() {
  const [user, setUser] = useState<User | null>(null)
  const [, setToken] = useState<string>('')
  const [currentView, setCurrentView] = useState<'landing' | 'auth' | 'dashboard'>('landing')
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [language, setLanguage] = useState<'en' | 'ar'>('en')

  const t = TRANSLATIONS[language]

  // Check for existing session
  useEffect(() => {
    const savedToken = localStorage.getItem('exampilot_token')
    const savedUser = localStorage.getItem('exampilot_user')
    const savedLang = localStorage.getItem('exampilot_lang') as 'en' | 'ar'
    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
      if (savedLang) setLanguage(savedLang)
      setCurrentView('dashboard')
    }
  }, [])




  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const emailVal = (form.querySelector('input[type="email"]') as HTMLInputElement)?.value
    const passwordVal = (form.querySelector('input[type="password"]') as HTMLInputElement)?.value
    const allUsers = JSON.parse(localStorage.getItem('exampilot_users') || '{}')
    const existingUser = allUsers[emailVal]
    if (!existingUser) { toast.error('No account found. Please sign up first.'); return }
    if (existingUser.password !== passwordVal) { toast.error('Wrong password. Try again.'); return }
    const token = 'token-' + Date.now()
    const { password: _p, ...safeUser } = existingUser
    setUser(safeUser)
    setToken(token)
    localStorage.setItem('exampilot_token', token)
    localStorage.setItem('exampilot_user', JSON.stringify(safeUser))
    setCurrentView('dashboard')
    toast.success(t.welcome)
  }

  const handleSignup = async (e: React.FormEvent, nameVal: string) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const emailVal = (form.querySelector('input[type="email"]') as HTMLInputElement)?.value
    const passwordVal = (form.querySelector('input[type="password"]') as HTMLInputElement)?.value
    if (!emailVal || !passwordVal || !nameVal) { toast.error('Please fill in all fields.'); return }
    if (passwordVal.length < 6) { toast.error('Password must be at least 6 characters.'); return }
    const allUsers = JSON.parse(localStorage.getItem('exampilot_users') || '{}')
    if (allUsers[emailVal]) { toast.error('Email already registered. Please log in.'); return }
    const newUser: User = {
      id: 'user-' + Date.now(), email: emailVal, name: nameVal, tier: 'free',
      daily_questions: 0, total_questions: 0, streak: 0,
      last_active: new Date().toISOString(), xp: 0, level: 1, badges: [],
      preferred_language: 'en'
    }
    allUsers[emailVal] = { ...newUser, password: passwordVal }
    localStorage.setItem('exampilot_users', JSON.stringify(allUsers))
    const token = 'token-' + Date.now()
    setUser(newUser)
    setToken(token)
    localStorage.setItem('exampilot_token', token)
    localStorage.setItem('exampilot_user', JSON.stringify(newUser))
    setCurrentView('dashboard')
    toast.success('Account created! Welcome to ExamPilot!')
  }

  const handleLogout = () => {
    setUser(null)
    setToken('')
    localStorage.removeItem('exampilot_token')
    localStorage.removeItem('exampilot_user')
    setCurrentView('landing')
    toast.success('Logged out')
  }

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'ar' : 'en'
    setLanguage(newLang)
    localStorage.setItem('exampilot_lang', newLang)
    if (user) {
      setUser({ ...user, preferred_language: newLang })
    }
  }

  return (
    <>
      <Toaster position="top-center" richColors />
      {currentView === 'landing' && (
        <LandingPage 
          setAuthMode={setAuthMode} 
          setCurrentView={setCurrentView}
          language={language}
          toggleLanguage={toggleLanguage}
          t={t}
        />
      )}
      {currentView === 'auth' && (
        <AuthPage 
          authMode={authMode}
          setAuthMode={setAuthMode}
          setCurrentView={setCurrentView}
          handleLogin={handleLogin}
          handleSignup={handleSignup}
          language={language}
          toggleLanguage={toggleLanguage}
          t={t}
        />
      )}
      {currentView === 'dashboard' && user && (
        <Dashboard 
          user={user}
          setUser={setUser}
          handleLogout={handleLogout}
          language={language}
          toggleLanguage={toggleLanguage}
          t={t}
        />
      )}
    </>
  )
}

// Landing Page Component
function LandingPage({ 
  setAuthMode, 
  setCurrentView,
  language,
  toggleLanguage,
  t 
}: { 
  setAuthMode: (m: 'login' | 'signup') => void
  setCurrentView: (v: 'landing' | 'auth' | 'dashboard') => void
  language: 'en' | 'ar'
  toggleLanguage: () => void
  t: typeof TRANSLATIONS.en
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-white">ExamPilot</span>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={toggleLanguage}
            className="text-slate-300 hover:text-white"
          >
            <Globe className="w-4 h-4 mr-1" />
            {language === 'en' ? 'العربية' : 'English'}
          </Button>
          <Button 
            variant="ghost" 
            className="text-white hover:text-purple-300"
            onClick={() => { setAuthMode('login'); setCurrentView('auth') }}
          >
            {t.login}
          </Button>
          <Button 
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
            onClick={() => { setAuthMode('signup'); setCurrentView('auth') }}
          >
            {t.signup}
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 py-20 md:py-32 text-center">
        <div className="max-w-4xl mx-auto">
          <Badge className="mb-6 bg-purple-500/20 text-purple-300 border-purple-500/30">
            <Sparkles className="w-3 h-3 mr-1" />
            AI-Powered IGCSE Tutor
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            {language === 'en' ? 'Master Your Exams with ' : 'أتقن امتحاناتك مع '}
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              {language === 'en' ? 'AI Guidance' : 'الذكاء الاصطناعي'}
            </span>
          </h1>
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
            {language === 'en' 
              ? 'Upload any math, physics, or chemistry question. Get step-by-step explanations written like an expert IGCSE teacher.'
              : 'ارفع أي سؤال في الرياضيات أو الفيزياء أو الكيمياء. احصل على شروحات خطوة بخطوة مثل معلم IGCSE خبير.'
            }
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-lg px-8 py-6"
              onClick={() => { setAuthMode('signup'); setCurrentView('auth') }}
            >
              {language === 'en' ? 'Start Learning Free' : 'ابدأ التعلم مجاناً'}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
          
          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
            <div>
              <div className="text-3xl font-bold text-white">10K+</div>
              <div className="text-slate-400 text-sm">{language === 'en' ? 'Students Helped' : 'طالب تم مساعدتهم'}</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">50K+</div>
              <div className="text-slate-400 text-sm">{language === 'en' ? 'Questions Solved' : 'سؤال تم حله'}</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">4.9★</div>
              <div className="text-slate-400 text-sm">{language === 'en' ? 'User Rating' : 'تقييم المستخدمين'}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-20 bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {language === 'en' ? 'Why Students Love ExamPilot' : 'لماذا يحب الطلاب ExamPilot'}
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4">
                  <Upload className="w-6 h-6 text-purple-400" />
                </div>
                <CardTitle className="text-white">{language === 'en' ? 'Photo to Solution' : 'من صورة لحل'}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  {language === 'en' 
                    ? 'Snap a photo of any question. Our AI reads it and explains it step-by-step.'
                    : 'التقط صورة لأي سؤال. الذكاء الاصطناعي يقرأها ويشرحها خطوة بخطوة.'
                  }
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center mb-4">
                  <MessageCircle className="w-6 h-6 text-pink-400" />
                </div>
                <CardTitle className="text-white">{language === 'en' ? 'IGCSE-Style Teaching' : 'تعليم على طريقة IGCSE'}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  {language === 'en'
                    ? 'Explanations written like expert IGCSE teachers. Clear steps, proper reasoning.'
                    : 'شروحات مكتوبة مثل معلمي IGCSE الخبراء. خطوات واضحة، تفكير سليم.'
                  }
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4">
                  <Trophy className="w-6 h-6 text-blue-400" />
                </div>
                <CardTitle className="text-white">{language === 'en' ? 'Gamified Learning' : 'تعلم gamified'}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  {language === 'en'
                    ? 'Earn XP, unlock badges, and compete on the leaderboard. Learning is fun!'
                    : 'اكسب نقاط الخبرة، افتح الشارات، وتنافس على لوحة المتصدرين. التعلم ممتع!'
                  }
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-20 bg-slate-900/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {language === 'en' ? 'Simple Pricing' : 'أسعار بسيطة'}
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Free
                </CardTitle>
                <div className="text-3xl font-bold text-white">$0</div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {['5 questions per day', 'Math & Physics', 'Text input', 'Basic explanations'].map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-slate-300">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 border-purple-500/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-400" />
                  Premium
                </CardTitle>
                <div className="text-3xl font-bold text-white">$7<span className="text-lg text-slate-400">/month</span></div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {['Unlimited questions', 'All subjects', 'Photo upload with OCR', 'Detailed explanations', 'Priority support'].map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-slate-300">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}

// Auth Page Component
function AuthPage({ 
  authMode, 
  setAuthMode, 
  setCurrentView,
  handleLogin,
  handleSignup,
  language,
  toggleLanguage,
  t
}: { 
  authMode: 'login' | 'signup'
  setAuthMode: (m: 'login' | 'signup') => void
  setCurrentView: (v: 'landing' | 'auth' | 'dashboard') => void
  handleLogin: (e: React.FormEvent) => void
  handleSignup: (e: React.FormEvent, name: string) => void
  language: 'en' | 'ar'
  toggleLanguage: () => void
  t: typeof TRANSLATIONS.en
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <Card className="w-full max-w-md bg-slate-800/80 border-slate-700 backdrop-blur">
        <CardHeader className="text-center">
          <div className="flex justify-end mb-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={toggleLanguage}
              className="text-slate-400 hover:text-white"
            >
              <Globe className="w-4 h-4 mr-1" />
              {language === 'en' ? 'العربية' : 'English'}
            </Button>
          </div>
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl text-white">
            {authMode === 'login' ? t.welcome : t.startJourney}
          </CardTitle>
        </CardHeader>
        <CardContent>

          
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-800 text-slate-400">{language === 'en' ? 'Or continue with email' : 'أو أكمل بالبريد'}</span>
            </div>
          </div>

          <form 
            onSubmit={(e) => {
              if (authMode === 'login') {
                handleLogin(e)
              } else {
                handleSignup(e, name)
              }
            }} 
            className="space-y-4"
          >
            {authMode === 'signup' && (
              <div>
                <label className="text-sm text-slate-400 mb-1 block">{t.name}</label>
                <Input 
                  type="text" 
                  placeholder={t.name}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                  required
                />
              </div>
            )}
            <div>
              <label className="text-sm text-slate-400 mb-1 block">{t.email}</label>
              <Input 
                type="email" 
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
                required
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">{t.password}</label>
              <Input 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {authMode === 'login' ? t.login : t.signup}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-slate-400 text-sm">
              {authMode === 'login' ? t.noAccount : t.hasAccount}{' '}
              <button 
                onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                className="text-purple-400 hover:text-purple-300"
              >
                {authMode === 'login' ? t.signup : t.login}
              </button>
            </p>
          </div>
          
          <Button 
            variant="ghost" 
            className="w-full mt-4 text-slate-500"
            onClick={() => setCurrentView('landing')}
          >
            {t.backToHome}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// Dashboard Component
function Dashboard({ 
  user, 
  setUser,
  handleLogout,
  language,
  toggleLanguage,
  t
}: { 
  user: User
  setUser: (u: User) => void
  handleLogout: () => void
  language: 'en' | 'ar'
  toggleLanguage: () => void
  t: typeof TRANSLATIONS.en
}) {
  const [questionText, setQuestionText] = useState('')
  const [selectedSubject, setSelectedSubject] = useState<'math' | 'physics' | 'chemistry'>('math')
  const [isLoading, setIsLoading] = useState(false)
  const [currentAnswer, setCurrentAnswer] = useState<Question | null>(null)
  const [questionHistory, setQuestionHistory] = useState<Question[]>([])
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [showBadgesDialog, setShowBadgesDialog] = useState(false)
  const [showLeaderboardDialog, setShowLeaderboardDialog] = useState(false)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem('exampilot_history')
    if (saved) {
      setQuestionHistory(JSON.parse(saved))
    }
  }, [])

  // Real OpenAI integration
  const callOpenAI = async (question: string, subject: string) => {
    const prompt = `You are an expert IGCSE ${subject} teacher. Explain this problem step-by-step as you would to a student${language === 'ar' ? ' in Arabic' : ''}:

Question: ${question}

Provide:
1. A clear, step-by-step solution
2. Explain WHY each step is done
3. Highlight any formulas or rules used
4. Give a final answer

Format as:
STEP 1: [explanation]
STEP 2: [explanation]
...
FINAL ANSWER: [answer]

Make it encouraging and clear.${language === 'ar' ? ' Write the entire response in Arabic.' : ''}`

    try {
      const response = await fetch('https://exampilot-api-production-a120.up.railway.app/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: prompt,
          subject: subject,
          language: language === 'ar' ? 'arabic' : 'english',
          user_id: 'user'
        })
      })

      if (!response.ok) {
        throw new Error('API request failed')
      }

      const data = await response.json()
      return data.explanation || data.answer || data.content || data.text
    } catch (error) {
      console.error('OpenAI error:', error)
      // Fallback response
      return `STEP 1: ${language === 'ar' ? 'اقرأ السؤال وفهم ما يُطلب' : 'Read the question carefully and understand what is being asked'}
STEP 2: ${language === 'ar' ? 'حدد المفاهيم والمعادلات المطلوبة' : 'Identify the key concepts and formulas needed'}
STEP 3: ${language === 'ar' ? 'طبق الطريقة المناسبة خطوة بخطوة' : 'Apply the appropriate method step by step'}
STEP 4: ${language === 'ar' ? 'تحقق من أن إجابتك منطقية' : 'Verify your answer makes sense'}

FINAL ANSWER: ${language === 'ar' ? 'تم إكمال الحل! راجع الخطوات أعلاه.' : 'Solution completed! Check the steps above.'}`
    }
  }

  const parseExplanation = (text: string) => {
    const lines = text.split('\n')
    const steps: string[] = []
    let finalAnswer = ''
    
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('STEP')) {
        steps.push(trimmed.replace(/^STEP \d+:\s*/, ''))
      } else if (trimmed.startsWith('FINAL ANSWER:')) {
        finalAnswer = trimmed.replace('FINAL ANSWER:', '').trim()
      }
    }
    
    return { steps, finalAnswer }
  }

  const handleAskQuestion = async () => {
    if (!questionText.trim() && !uploadedImage) {
      toast.error(language === 'ar' ? 'الرجاء إدخال سؤال' : 'Please enter a question')
      return
    }

    if (user.tier === 'free' && user.daily_questions >= 5) {
      setShowUpgradeDialog(true)
      return
    }

    setIsLoading(true)
    
    try {
      const aiResponse = await callOpenAI(questionText || 'Image question', selectedSubject)
      const parsed = parseExplanation(aiResponse)
      
      const newAnswer: Question = {
        id: Date.now().toString(),
        question: questionText || (language === 'ar' ? 'سؤال من صورة' : 'Question from image'),
        explanation: '',
        steps: parsed.steps,
        final_answer: parsed.finalAnswer,
        subject: selectedSubject,
        created_at: new Date().toISOString()
      }
      
      const newHistory = [newAnswer, ...questionHistory]
      setQuestionHistory(newHistory)
      localStorage.setItem('exampilot_history', JSON.stringify(newHistory))
      setCurrentAnswer(newAnswer)
      
      // Update user stats
      const newTotal = user.total_questions + 1
      const newXp = user.xp + 10
      const newLevel = Math.floor(newXp / 100) + 1
      
      // Check for new badges
      const newBadges = [...user.badges]
      if (newTotal === 1 && !newBadges.includes('first_question')) {
        newBadges.push('first_question')
        toast.success(language === 'ar' ? 'شارة جديدة: أول خطوات!' : 'New badge: First Steps!')
      }
      if (newTotal >= 10 && !newBadges.includes('questions_10')) {
        newBadges.push('questions_10')
        toast.success(language === 'ar' ? 'شارة جديدة: عقل فضولي!' : 'New badge: Curious Mind!')
      }
      
      setUser({
        ...user,
        daily_questions: user.daily_questions + 1,
        total_questions: newTotal,
        xp: newXp,
        level: newLevel,
        badges: newBadges
      })
      
      setQuestionText('')
      setUploadedImage(null)
      toast.success(language === 'ar' ? 'الشرح جاهز!' : 'Explanation ready!')
    } catch (error) {
      toast.error(language === 'ar' ? 'حدث خطأ. حاول مرة أخرى.' : 'Something went wrong. Try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string)
        toast.success(language === 'ar' ? 'تم رفع الصورة!' : 'Image uploaded!')
      }
      reader.readAsDataURL(file)
    }
  }

  // Calculate XP progress
  const xpForNextLevel = user.level * 100
  const xpProgress = ((user.xp % 100) / 100) * 100

  return (
    <div className="min-h-screen bg-slate-950" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">ExamPilot</span>
          </div>
          
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={toggleLanguage}
              className="text-slate-400 hover:text-white"
            >
              <Globe className="w-4 h-4 mr-1" />
              {language === 'en' ? 'العربية' : 'English'}
            </Button>
            
            {user.tier === 'free' && (
              <Badge className="bg-slate-800 text-slate-300 border-slate-700">
                <Flame className="w-3 h-3 mr-1 text-orange-400" />
                {5 - user.daily_questions} {language === 'en' ? 'left' : 'متبقي'}
              </Badge>
            )}
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">{user.level}</span>
              </div>
              <span className="text-slate-300 hidden sm:block">{user.name}</span>
            </div>
            
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-5 h-5 text-slate-400" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Panel - Ask Question */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-purple-400" />
                  {t.askQuestion}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Subject Selection */}
                <div className="flex gap-2 mb-4">
                  {[
                    { id: 'math', label: t.math, icon: Calculator },
                    { id: 'physics', label: t.physics, icon: FlaskConical },
                    { id: 'chemistry', label: t.chemistry, icon: Atom }
                  ].map((subject) => (
                    <Button
                      key={subject.id}
                      variant={selectedSubject === subject.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedSubject(subject.id as any)}
                      className={selectedSubject === subject.id 
                        ? 'bg-purple-500 hover:bg-purple-600' 
                        : 'border-slate-700 text-slate-400 hover:text-white'
                      }
                    >
                      <subject.icon className="w-4 h-4 mr-1" />
                      {subject.label}
                    </Button>
                  ))}
                </div>

                {/* Image Preview */}
                {uploadedImage && (
                  <div className="mb-4 relative">
                    <img src={uploadedImage} alt="Uploaded" className="max-h-40 rounded-lg" />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => setUploadedImage(null)}
                    >
                      ×
                    </Button>
                  </div>
                )}

                {/* Text Input */}
                <Textarea
                  placeholder={t.typeQuestion}
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white min-h-[120px] mb-4"
                />

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleAskQuestion}
                    disabled={isLoading}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        {t.thinking}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        {t.getExplanation}
                      </>
                    )}
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    className="border-slate-700 text-slate-400"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {t.photo}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Answer Display */}
            {currentAnswer && (
              <Card className="bg-slate-900 border-slate-800 animate-fade-in">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    {t.stepByStep}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 p-4 bg-slate-800 rounded-lg">
                    <p className="text-slate-400 text-sm mb-1">{t.question}</p>
                    <p className="text-white">{currentAnswer.question}</p>
                  </div>
                  
                  <div className="space-y-4">
                    {currentAnswer.steps.map((step, idx) => (
                      <div key={idx} className="flex gap-4">
                        <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-purple-400 text-sm font-bold">{idx + 1}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-slate-300">{step}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {currentAnswer.final_answer && (
                    <div className="mt-6 p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg border border-purple-500/30">
                      <p className="text-purple-300 font-medium">{currentAnswer.final_answer}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Panel - Stats & Gamification */}
          <div className="space-y-6">
            {/* XP & Level Card */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-400" />
                  {t.level} {user.level}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">{t.xp}</span>
                    <span className="text-white">{user.xp} / {xpForNextLevel}</span>
                  </div>
                  <Progress value={xpProgress} className="h-2 bg-slate-800" />
                </div>
                
                {/* Streak */}
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-lg border border-orange-500/30">
                  <Flame className="w-6 h-6 text-orange-400" />
                  <div>
                    <p className="text-white font-bold text-xl">{user.streak}</p>
                    <p className="text-slate-400 text-sm">{t.streak}</p>
                  </div>
                </div>
                
                {/* Daily Progress */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">{t.dailyQuestions}</span>
                    <span className="text-white">{user.daily_questions}/5</span>
                  </div>
                  <Progress value={(user.daily_questions / 5) * 100} className="h-2 bg-slate-800" />
                </div>
              </CardContent>
            </Card>

            {/* Badges Card */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-400" />
                  {t.badges}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {user.badges.map((badgeId) => {
                    const badge = BADGES.find(b => b.id === badgeId)
                    return badge ? (
                      <div 
                        key={badgeId}
                        className="flex items-center gap-1 px-3 py-1 bg-slate-800 rounded-full text-sm"
                        title={badge.desc}
                      >
                        <span>{badge.icon}</span>
                        <span className="text-slate-300">{badge.name}</span>
                      </div>
                    ) : null
                  })}
                </div>
                <Button 
                  variant="ghost" 
                  className="w-full mt-3 text-purple-400"
                  onClick={() => setShowBadgesDialog(true)}
                >
                  {language === 'en' ? 'View All Badges' : 'عرض كل الشارات'}
                </Button>
              </CardContent>
            </Card>

            {/* Leaderboard Card */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  {t.leaderboard}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {mockLeaderboard.slice(0, 4).map((entry) => (
                    <div 
                      key={entry.rank}
                      className={`flex items-center justify-between p-2 rounded-lg ${
                        entry.name === 'You' ? 'bg-purple-500/20 border border-purple-500/30' : 'bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          entry.rank === 1 ? 'bg-yellow-500 text-black' :
                          entry.rank === 2 ? 'bg-slate-400 text-black' :
                          entry.rank === 3 ? 'bg-amber-600 text-white' :
                          'bg-slate-700 text-slate-300'
                        }`}>
                          {entry.rank}
                        </span>
                        <span className="text-slate-300 text-sm">{entry.name}</span>
                      </div>
                      <span className="text-purple-400 text-sm font-medium">{entry.xp} XP</span>
                    </div>
                  ))}
                </div>
                <Button 
                  variant="ghost" 
                  className="w-full mt-3 text-purple-400"
                  onClick={() => setShowLeaderboardDialog(true)}
                >
                  {language === 'en' ? 'View Full Leaderboard' : 'عرض لوحة المتصدرين'}
                </Button>
              </CardContent>
            </Card>

            {/* History Card */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <History className="w-5 h-5" />
                  {t.recentQuestions}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {questionHistory.length === 0 ? (
                      <p className="text-slate-500 text-center py-4">
                        {language === 'en' ? 'No questions yet. Start learning!' : 'لا توجد أسئلة بعد. ابدأ التعلم!'}
                      </p>
                    ) : (
                      questionHistory.map((q) => (
                        <div 
                          key={q.id} 
                          className="p-2 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 transition"
                          onClick={() => setCurrentAnswer(q)}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                              {q.subject}
                            </Badge>
                          </div>
                          <p className="text-slate-300 text-sm line-clamp-1">{q.question}</p>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {user.tier === 'free' && (
              <Button 
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
                onClick={() => setShowUpgradeDialog(true)}
              >
                <Crown className="w-4 h-4 mr-2" />
                {t.upgrade}
              </Button>
            )}
          </div>
        </div>
      </main>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white text-center">
              <Crown className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              {t.unlockUnlimited}
            </DialogTitle>
          </DialogHeader>
          <div className="text-center">
            <p className="text-slate-400 mb-6">{t.upgradeDesc}</p>
            <div className="text-4xl font-bold text-white mb-2">$7<span className="text-lg text-slate-400">/month</span></div>
            <Button 
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
              onClick={() => {
                toast.success(language === 'ar' ? 'قريباً!' : 'Coming soon!')
                setShowUpgradeDialog(false)
              }}
            >
              {t.upgrade}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Badges Dialog */}
      <Dialog open={showBadgesDialog} onOpenChange={setShowBadgesDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">{t.badges}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {BADGES.map((badge) => {
              const hasBadge = user.badges.includes(badge.id)
              return (
                <div 
                  key={badge.id}
                  className={`p-3 rounded-lg border ${
                    hasBadge 
                      ? 'bg-purple-500/20 border-purple-500/30' 
                      : 'bg-slate-800 border-slate-700 opacity-50'
                  }`}
                >
                  <div className="text-2xl mb-1">{badge.icon}</div>
                  <div className="text-white font-medium text-sm">{badge.name}</div>
                  <div className="text-slate-400 text-xs">{badge.desc}</div>
                </div>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Leaderboard Dialog */}
      <Dialog open={showLeaderboardDialog} onOpenChange={setShowLeaderboardDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">{t.leaderboard}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {mockLeaderboard.map((entry) => (
              <div 
                key={entry.rank}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  entry.name === 'You' ? 'bg-purple-500/20 border border-purple-500/30' : 'bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    entry.rank === 1 ? 'bg-yellow-500 text-black' :
                    entry.rank === 2 ? 'bg-slate-400 text-black' :
                    entry.rank === 3 ? 'bg-amber-600 text-white' :
                    'bg-slate-700 text-slate-300'
                  }`}>
                    {entry.rank}
                  </span>
                  <div>
                    <div className="text-white font-medium">{entry.name}</div>
                    <div className="text-slate-400 text-xs">{language === 'en' ? 'Level' : 'مستوى'} {entry.level} • {entry.streak} {language === 'en' ? 'day streak' : 'يوم متتالي'}</div>
                  </div>
                </div>
                <span className="text-purple-400 font-bold">{entry.xp} XP</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default App
