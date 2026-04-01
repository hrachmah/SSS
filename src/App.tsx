/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  Calendar, 
  User, 
  Activity, 
  ShoppingBag, 
  Utensils, 
  Weight, 
  ArrowRight,
  CheckCircle2,
  Clock,
  Info,
  Target,
  Scale,
  Ruler,
  Droplets,
  Flame,
  Plus,
  Minus,
  Printer,
  Lightbulb,
  Download,
  Loader2,
  MessageSquare,
  AlertTriangle,
  Send,
  Edit,
  X
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { GoogleGenAI } from "@google/genai";
import { AppState, UserProfile, WeeklyCheckIn, DailyLog, ActivityLevel, Phase, Gender, MacroType } from './types';
import { calculateBMR, calculateTDEE, calculateTargetCalories, calculateMacros, getPhase, getWeekNumber, getDayOfProgram } from './lib/calculations';

const STORAGE_KEY = 'santuy_coach_data';

const DAILY_TIPS = [
  "Tidur 7-8 jam membantu proses pembakaran lemak dan pemulihan otot.",
  "Minum segelas air putih segera setelah bangun tidur untuk mengaktifkan metabolisme.",
  "Kunyah makanan pelan-pelan (20-30 kali) agar otak sempat menerima sinyal kenyang.",
  "Gunakan piring yang lebih kecil untuk membantu mengontrol porsi makan secara psikologis.",
  "Jangan lewatkan sarapan, ini adalah bahan bakar utama untuk memulai hari.",
  "Kurangi konsumsi gula tambahan, ganti dengan buah segar jika ingin yang manis.",
  "Berjalan kaki 10-15 menit setelah makan membantu menurunkan kadar gula darah.",
  "Siapkan camilan sehat (seperti kacang atau buah) agar tidak jajan sembarangan.",
  "Konsistensi lebih penting daripada intensitas. Tetaplah bergerak setiap hari.",
  "Kelola stres dengan meditasi atau hobi, karena stres tinggi bisa memicu lapar palsu."
];

const MOTIVATIONS = [
  "Konsistensi lebih penting daripada kesempurnaan. Tetap santuy tapi pasti menuju goals-mu!",
  "Satu langkah kecil setiap hari lebih baik daripada langkah besar tapi cuma sesekali.",
  "Jangan bandingkan prosesmu dengan orang lain. Kamu punya waktumu sendiri.",
  "Air putih adalah sahabat terbaikmu hari ini. Jangan lupa minum!",
  "Capek itu wajar, istirahatlah. Tapi jangan pernah menyerah.",
  "Fokus pada seberapa jauh kamu sudah melangkah, bukan seberapa jauh lagi yang harus ditempuh.",
  "Diet santuy bukan berarti malas, tapi pintar mengatur strategi.",
  "Setiap tetes keringat dan setiap gelas air putih membawa kamu lebih dekat ke target.",
  "Jadikan makanan sehat sebagai bahan bakar, bukan hukuman.",
  "Hari ini adalah kesempatan baru untuk menjadi versi dirimu yang lebih baik."
];

export default function App() {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved data", e);
      }
    }
    return {
      profile: null,
      weeklyCheckIns: [],
      dailyLogs: {},
      startDate: null,
    };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayLog = state.dailyLogs[todayStr];

  const currentWeek = useMemo(() => {
    if (!state.startDate) return 1;
    return getWeekNumber(new Date(state.startDate), new Date());
  }, [state.startDate]);

  const currentDayOfProgram = useMemo(() => {
    if (!state.startDate) return 1;
    return getDayOfProgram(new Date(state.startDate), new Date());
  }, [state.startDate]);

  const currentPhase = useMemo(() => getPhase(currentWeek), [currentWeek]);

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const handlePrint = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // Create a temporary container for printing
    const printContainer = document.createElement('div');
    printContainer.className = 'print-only';
    
    // Add PrintHeader clone if it exists
    const header = document.getElementById('print-header-content');
    if (header) {
      const headerClone = header.cloneNode(true) as HTMLElement;
      headerClone.classList.remove('hidden');
      headerClone.classList.add('block');
      printContainer.appendChild(headerClone);
    }
    
    // Clone the element instead of innerHTML to preserve more state/styles
    const clone = element.cloneNode(true) as HTMLElement;
    clone.id = `print-${elementId}`;
    printContainer.appendChild(clone);
    
    // Add to body
    document.body.appendChild(printContainer);
    document.body.classList.add('is-printing');
    
    // Small delay to ensure browser has rendered the new element
    setTimeout(() => {
      window.print();
      
      // Cleanup
      document.body.classList.remove('is-printing');
      if (document.body.contains(printContainer)) {
        document.body.removeChild(printContainer);
      }
    }, 250);
  };

  const downloadAsPDF = async (elementId: string, fileName: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    setIsGeneratingPDF(true);
    
    // Create a temporary wrapper for PDF generation to include header and ensure visibility
    const wrapper = document.createElement('div');
    wrapper.style.position = 'absolute';
    wrapper.style.left = '-9999px';
    wrapper.style.top = '0';
    wrapper.style.width = '800px';
    wrapper.style.backgroundColor = 'white';
    wrapper.style.padding = '40px';
    wrapper.style.color = 'black';
    
    // Add PrintHeader clone
    const header = document.getElementById('print-header-content');
    if (header) {
      const headerClone = header.cloneNode(true) as HTMLElement;
      headerClone.classList.remove('hidden');
      headerClone.classList.add('block');
      headerClone.style.display = 'block';
      headerClone.style.marginBottom = '20px';
      wrapper.appendChild(headerClone);
    }
    
    // Add target element clone
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.display = 'block';
    clone.style.width = '100%';
    clone.style.height = 'auto';
    clone.style.overflow = 'visible';
    clone.style.transform = 'none';
    
    // Ensure all hidden elements for print are visible in the PDF
    const hiddenElements = clone.querySelectorAll('.print-show-all');
    hiddenElements.forEach(el => {
      (el as HTMLElement).style.display = 'block';
      (el as HTMLElement).style.height = 'auto';
      (el as HTMLElement).style.opacity = '1';
      (el as HTMLElement).style.visibility = 'visible';
    });

    // Remove elements that should be hidden in print
    const toHide = clone.querySelectorAll('.print\\:hidden');
    toHide.forEach(el => {
      (el as HTMLElement).style.display = 'none';
    });
    
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    try {
      // Wait a bit for any layout shifts
      await new Promise(resolve => setTimeout(resolve, 150));

      const canvas = await html2canvas(wrapper, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${fileName}.pdf`);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Gagal membuat PDF secara otomatis. Silakan gunakan fitur Print browser (Ctrl+P) lalu pilih "Save as PDF" sebagai alternatif.');
    } finally {
      if (document.body.contains(wrapper)) {
        document.body.removeChild(wrapper);
      }
      setIsGeneratingPDF(false);
    }
  };

  const needsWeeklyCheckIn = useMemo(() => {
    if (!state.profile) return false;
    if (state.weeklyCheckIns.length === 0) return true;
    
    // Check if today is the start of a new week relative to start date
    if (!state.startDate) return false;
    const dayOfProg = getDayOfProgram(new Date(state.startDate), new Date());
    const expectedCheckIns = Math.ceil(dayOfProg / 7);
    return state.weeklyCheckIns.length < expectedCheckIns;
  }, [state.profile, state.weeklyCheckIns, state.startDate]);

  useEffect(() => {
    if (!state.profile || !state.startDate) return;

    const checkAndNotify = async () => {
      if (!('Notification' in window)) return;
      
      if (Notification.permission === 'default') {
        try {
          await Notification.requestPermission();
        } catch (e) {
          console.error("Notification permission request failed", e);
        }
      }

      if (Notification.permission === 'granted') {
        const today = new Date().toISOString().split('T')[0];
        const lastNotified = localStorage.getItem('santuy_last_notified');
        
        if (lastNotified !== today) {
          const needsDailyLog = !state.dailyLogs[today];

          // We use currentWeek and needsWeeklyCheckIn from the outer scope
          if (needsWeeklyCheckIn) {
            new Notification('Waktunya Check-in Mingguan! ⚖️', {
              body: `Minggu ke-${currentWeek} telah selesai. Yuk catat berat badan dan lingkar tubuhmu!`,
            });
            localStorage.setItem('santuy_last_notified', today);
          } else if (needsDailyLog) {
            new Notification('Update Aktivitas Hari Ini 🏃‍♂️', {
              body: 'Apakah hari ini Rest Day atau Active Day? Yuk catat di aplikasi!',
            });
            localStorage.setItem('santuy_last_notified', today);
          }
        }
      }
    };

    // Small delay to not annoy the user immediately on load
    const timer = setTimeout(checkAndNotify, 3000);
    return () => clearTimeout(timer);
  }, [state.profile, state.startDate, state.dailyLogs, needsWeeklyCheckIn, currentWeek]);

  const [view, setView] = useState<'diet' | 'progress' | 'profile' | 'chat'>('diet');

  const handleProfileSubmit = (profile: UserProfile) => {
    const startDate = new Date().toISOString().split('T')[0];
    const bmr = calculateBMR(profile.initialWeight, profile.height, profile.age, profile.gender);
    const tdee = calculateTDEE(bmr, profile.baseActivityLevel);
    const targetCalories = calculateTargetCalories(tdee, bmr, profile.gender);
    const macros = calculateMacros(targetCalories, profile.macroPreference);

    const initialCheckIn: WeeklyCheckIn = {
      weekNumber: 1,
      date: startDate,
      weight: profile.initialWeight,
      ...profile.initialMeasurements,
      targetCalories,
      macros,
    };

    setState(prev => ({
      ...prev,
      profile,
      startDate,
      weeklyCheckIns: [initialCheckIn],
    }));
    setView('profile');
  };

  const handleProfileUpdate = (updatedProfile: UserProfile) => {
    setState(prev => {
      if (!prev.profile) return prev;
      
      // Recalculate targets for the LATEST check-in based on new profile data
      const latestCheckIn = prev.weeklyCheckIns[prev.weeklyCheckIns.length - 1];
      const bmr = calculateBMR(latestCheckIn.weight, updatedProfile.height, updatedProfile.age, updatedProfile.gender);
      const tdee = calculateTDEE(bmr, updatedProfile.baseActivityLevel);
      const targetCalories = calculateTargetCalories(tdee, bmr, updatedProfile.gender);
      const macros = calculateMacros(targetCalories, updatedProfile.macroPreference);

      const updatedCheckIns = [...prev.weeklyCheckIns];
      updatedCheckIns[updatedCheckIns.length - 1] = {
        ...latestCheckIn,
        targetCalories,
        macros,
      };

      return {
        ...prev,
        profile: updatedProfile,
        weeklyCheckIns: updatedCheckIns,
      };
    });
    setIsEditingProfile(false);
  };

  const handleWeeklyCheckIn = (weight: number, measurements: { belly?: number; waist?: number; hip?: number; neck?: number; arm?: number; thigh?: number }) => {
    if (!state.profile) return;
    
    const bmr = calculateBMR(weight, state.profile.height, state.profile.age, state.profile.gender);
    const tdee = calculateTDEE(bmr, state.profile.baseActivityLevel);
    const targetCalories = calculateTargetCalories(tdee, bmr, state.profile.gender);
    const macros = calculateMacros(targetCalories, state.profile.macroPreference);

    const newCheckIn: WeeklyCheckIn = {
      weekNumber: state.weeklyCheckIns.length + 1,
      date: todayStr,
      weight,
      ...measurements,
      targetCalories,
      macros,
    };

    setState(prev => ({
      ...prev,
      weeklyCheckIns: [...prev.weeklyCheckIns, newCheckIn],
    }));
  };

  const handleDailyActivity = (activity: ActivityLevel) => {
    setState(prev => ({
      ...prev,
      dailyLogs: {
        ...prev.dailyLogs,
        [todayStr]: { date: todayStr, activity }
      }
    }));
  };

  const handleUpdateDailyLog = (updates: Partial<DailyLog>) => {
    setState(prev => ({
      ...prev,
      dailyLogs: {
        ...prev.dailyLogs,
        [todayStr]: { ...prev.dailyLogs[todayStr], ...updates }
      }
    }));
  };

  if (!state.profile) {
    return <ProfileSetup onSubmit={handleProfileSubmit} />;
  }

  const handleResetProfile = () => {
    localStorage.removeItem(STORAGE_KEY);
    setState({
      profile: null,
      weeklyCheckIns: [],
      dailyLogs: {},
      startDate: null,
    });
    setView('diet');
  };

  const handleSimulateDay = (daysToAdd: number) => {
    if (!state.startDate) return;
    
    // If daysToAdd is 0, reset to today
    if (daysToAdd === 0) {
      setState({ ...state, startDate: new Date().toISOString().split('T')[0] });
      alert('Waktu telah direset ke Hari 1. Silakan cek tab "Diet" untuk melihat perubahannya.');
      return;
    }

    // Otherwise, push the start date back to simulate time passing
    const currentStartDate = new Date();
    currentStartDate.setDate(currentStartDate.getDate() - daysToAdd);
    setState({ ...state, startDate: currentStartDate.toISOString().split('T')[0] });
    
    if (daysToAdd >= 7) {
      alert(`Waktu dimajukan ${daysToAdd} hari. Anda akan diarahkan ke halaman Check-in Mingguan.`);
    } else {
      alert(`Waktu dimajukan ${daysToAdd} hari. Silakan cek tab "Diet" untuk melihat perubahan hari dan menu.`);
    }
  };

  if (needsWeeklyCheckIn) {
    return <WeeklyCheckInView 
      weekNumber={Math.ceil(currentDayOfProgram / 7)} 
      onSubmit={handleWeeklyCheckIn} 
    />;
  }

  return (
    <div className="max-w-md mx-auto min-h-screen pb-24 px-4 pt-8 print:max-w-none print:p-0 print:m-0">
      <PrintHeader 
        week={currentWeek} 
        day={((currentDayOfProgram - 1) % 7) + 1} 
        phase={currentPhase} 
      />
      <Header 
        week={currentWeek} 
        day={((currentDayOfProgram - 1) % 7) + 1} 
        phase={currentPhase} 
        className="print:hidden"
      />

      {view === 'diet' ? (
        <div className="space-y-6">
          <HealthDisclaimer dayOfProgram={currentDayOfProgram} />
          {!todayLog ? (
            <DailyActivityPrompt onSelect={handleDailyActivity} />
          ) : (
            <>
              {((currentDayOfProgram - 1) % 7 === 0) && (
                <ShoppingList 
                  phase={currentPhase} 
                  currentWeek={currentWeek}
                  onDownloadPDF={() => downloadAsPDF('shopping-list-print', `Daftar-Belanja-Santuy-Minggu-${currentWeek}`)}
                  onPrint={() => handlePrint('shopping-list-print')}
                  isGenerating={isGeneratingPDF}
                  className="print:hidden" 
                />
              )}
              
              <MealPlan 
                phase={currentPhase} 
                activity={todayLog.activity} 
                targetCalories={state.weeklyCheckIns[state.weeklyCheckIns.length - 1].targetCalories}
                macros={state.weeklyCheckIns[state.weeklyCheckIns.length - 1].macros}
                exerciseCalories={todayLog.exercise?.caloriesBurned || 0}
                dayOfProgram={currentDayOfProgram}
                onDownloadPDF={() => downloadAsPDF(`meal-plan-day-${currentDayOfProgram}`, `Resep-Santuy-Hari-${currentDayOfProgram}`)}
                onPrint={() => handlePrint(`meal-plan-day-${currentDayOfProgram}`)}
                isGenerating={isGeneratingPDF}
                className="print:hidden"
              />

              <WeeklySchedule 
                currentWeek={currentWeek} 
                targetCalories={state.weeklyCheckIns[state.weeklyCheckIns.length - 1].targetCalories}
                macros={state.weeklyCheckIns[state.weeklyCheckIns.length - 1].macros}
                onDownloadPDF={() => downloadAsPDF('weekly-schedule-print', `Jadwal-Santuy-Minggu-${currentWeek}`)}
                onPrint={() => handlePrint('weekly-schedule-print')}
                isGenerating={isGeneratingPDF}
              />
              
              <DailyTracker 
                log={todayLog} 
                onUpdate={handleUpdateDailyLog} 
                weight={state.weeklyCheckIns[state.weeklyCheckIns.length - 1].weight} 
                onDownloadPDF={() => downloadAsPDF('daily-tracker-print', `Tracker-Santuy-Hari-${currentDayOfProgram}`)}
                onPrint={() => handlePrint('daily-tracker-print')}
                isGenerating={isGeneratingPDF}
                className="print:hidden"
              />

              <div className="card bg-brand-accent/10 border border-brand-accent/20 print:hidden">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb size={18} className="text-brand-accent" />
                  <h3 className="font-serif font-bold text-brand-primary">Tips Harian Santuy</h3>
                </div>
                <p className="text-sm text-brand-primary italic">
                  "{DAILY_TIPS[(currentDayOfProgram - 1) % DAILY_TIPS.length]}"
                </p>
              </div>

              <div className="card bg-brand-primary text-white print:hidden">
                <h3 className="font-serif font-bold mb-2">Motivasi Sehat Santuy Selalu</h3>
                <p className="text-sm opacity-90 italic">
                  "{MOTIVATIONS[(currentDayOfProgram - 1) % MOTIVATIONS.length]}"
                </p>
              </div>
            </>
          )}
        </div>
      ) : view === 'progress' ? (
        <ProgressView 
          checkIns={state.weeklyCheckIns} 
          initialWeight={state.profile.initialWeight} 
          onDownloadPDF={() => downloadAsPDF('progress-view-print', `Progres-Santuy-${state.profile?.name}`)}
          onPrint={() => handlePrint('progress-view-print')}
          isGenerating={isGeneratingPDF}
        />
      ) : view === 'chat' ? (
        <ChatView profile={state.profile} />
      ) : (
        <div className="space-y-6">
          {isEditingProfile ? (
            <ProfileEdit 
              profile={state.profile} 
              onSave={handleProfileUpdate} 
              onCancel={() => setIsEditingProfile(false)} 
            />
          ) : (
            <ProfileView 
              profile={state.profile} 
              onReset={handleResetProfile} 
              onEdit={() => setIsEditingProfile(true)}
              onSimulateDay={handleSimulateDay}
              onDownloadPDF={() => downloadAsPDF('profile-view-print', `Profil-Santuy-${state.profile?.name}`)}
              onPrint={() => handlePrint('profile-view-print')}
              isGenerating={isGeneratingPDF}
            />
          )}
        </div>
      )}

      <BottomNav currentView={view} setView={setView} className="print:hidden" />
      
      <div className="mt-8 mb-4 text-center print:hidden">
        <p className="text-[10px] text-brand-secondary font-medium opacity-50">
          Dikembangkan oleh Okke Huriah Rachmah. V.1.1
        </p>
      </div>
    </div>
  );
}

function WeeklySchedule({ currentWeek, targetCalories, macros, onDownloadPDF, onPrint, isGenerating }: { currentWeek: number, targetCalories: number, macros?: { protein: number, fat: number, carbs: number }, onDownloadPDF?: () => void, onPrint?: () => void, isGenerating?: boolean }) {
  const days = [1, 2, 3, 4, 5, 6, 7];
  const cycleIndex = Math.floor((currentWeek - 1) / 2);
  
  const proteinCycles = [
    ['Ayam', 'Ikan'],
    ['Daging Sapi (Tanpa Lemak)', 'Tahu & Tempe'],
    ['Udang / Cumi', 'Kacang Hijau / Edamame'],
    ['Dada Bebek (Tanpa Kulit)', 'Jamur & Tahu Sutra'],
    ['Ayam Kampung', 'Kacang Merah / Tempe Mendoan (Panggang)'],
  ];
  const currentProteinPair = proteinCycles[cycleIndex % proteinCycles.length];
  
  const cookingMethods = ['Panggang', 'Kukus', 'Pepes', 'Rebus', 'Sup Kuah Bening'];
  const vegetables = [
    'Selada Keriting (Lalap Mentah)', 
    'Selada Romaine (Tumis Bawang Putih)', 
    'Selada Air (Kuah Bening)', 
    'Selada Bokor / Iceberg (Rebus Sebentar)', 
    'Siomak / Selada Wangi (Tumis)', 
    'Selada Merah (Salad Segar)', 
    'Selada Romaine (Panggang)'
  ];

  const snack1Options = ['Pepaya / Semangka / Melon', 'Pir / Jeruk / Belimbing', 'Nanas / Naga / Jambu'];
  const snack2Options = ['1 Apel', '1 Pisang', '1 Pir'];
  const snack3Options = ['1 Jagung Rebus', '1 Ubi Rebus', '1 Kentang Rebus'];
  
  const currentSnack1 = snack1Options[cycleIndex % snack1Options.length];
  const currentSnack2 = snack2Options[cycleIndex % snack2Options.length];
  const currentSnack3 = snack3Options[cycleIndex % snack3Options.length];

  const timeOffsets = [0, 30, -30, 60, -60];
  const offset = timeOffsets[cycleIndex % timeOffsets.length];
  
  const shiftTime = (baseTime: string, offsetMinutes: number) => {
    const [h, m] = baseTime.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m + offsetMinutes, 0);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // Nutritional values per 100g (FatSecret Indonesia)
  const nutritionData: Record<string, { p: number, f: number, c: number, kcal: number }> = {
    'Ayam': { p: 31, f: 3.6, c: 0, kcal: 165 },
    'Ikan': { p: 26, f: 3, c: 0, kcal: 128 },
    'Daging Sapi (Tanpa Lemak)': { p: 26, f: 15, c: 0, kcal: 250 },
    'Tahu & Tempe': { p: 13, f: 8, c: 5, kcal: 140 },
    'Udang / Cumi': { p: 20, f: 1.5, c: 0, kcal: 95 },
    'Kacang Hijau / Edamame': { p: 11, f: 5, c: 10, kcal: 120 },
    'Dada Bebek (Tanpa Kulit)': { p: 24, f: 10, c: 0, kcal: 190 },
    'Jamur & Tahu Sutra': { p: 5, f: 3, c: 2, kcal: 50 },
    'Ayam Kampung': { p: 25, f: 10, c: 0, kcal: 190 },
    'Kacang Merah / Tempe Mendoan (Panggang)': { p: 15, f: 8, c: 15, kcal: 180 },
    'Nasi': { p: 2.7, f: 0.3, c: 27.9, kcal: 129 },
    'Telur': { p: 12.6, f: 10.6, c: 1.2, kcal: 155 },
    'Snack1': { p: 0.5, f: 0.3, c: 11, kcal: 43 },
    'Snack2': { p: 0.3, f: 0.2, c: 14, kcal: 52 },
    'Snack3': { p: 3.4, f: 1.5, c: 21, kcal: 96 },
    'Sayur': { p: 1.5, f: 0.2, c: 3, kcal: 20 },
  };

  const getPortions = (day: number) => {
    const dayOfProgram = (currentWeek - 1) * 7 + day;
    const isFirstProteinDay = (dayOfProgram + cycleIndex) % 2 !== 0;
    const protein = isFirstProteinDay ? currentProteinPair[0] : currentProteinPair[1];
    const proteinStats = nutritionData[protein] || nutritionData['Ayam'];
    const nasiStats = nutritionData['Nasi'];

    const targetP = macros?.protein || 60;
    const targetC = macros?.carbs || 100;

    const essentialCarbs = (nutritionData['Telur'].c) + (nutritionData['Sayur'].c * 2);
    const remainingCarbs = Math.max(0, targetC - essentialCarbs);
    const carbsForNasi = remainingCarbs * 0.6;
    const carbsForSnacks = remainingCarbs * 0.4;

    const totalNasiWeight = (carbsForNasi / nasiStats.c) * 100;
    const finalNasiWeight = Math.min(250, Math.max(50, Math.round(totalNasiWeight / 2)));

    const s1Weight = Math.min(250, Math.max(50, Math.round((carbsForSnacks * 0.4 / nutritionData['Snack1'].c) * 100)));
    const s2Weight = Math.min(150, Math.max(50, Math.round((carbsForSnacks * 0.3 / nutritionData['Snack2'].c) * 100)));
    const s3Weight = Math.min(150, Math.max(50, Math.round((carbsForSnacks * 0.3 / nutritionData['Snack3'].c) * 100)));

    const essentialProtein = (nutritionData['Telur'].p) + (nutritionData['Sayur'].p * 2);
    const remainingProtein = Math.max(0, targetP - essentialProtein);
    const finalProteinWeight = Math.min(250, Math.max(100, Math.round((remainingProtein / 2 / proteinStats.p) * 100)));

    return {
      nasi: finalNasiWeight,
      protein: finalProteinWeight,
      s1: s1Weight,
      s2: s2Weight,
      s3: s3Weight
    };
  };

  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  return (
    <div id="weekly-schedule-print" className="card space-y-4 print:shadow-none print:border-none">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-brand-accent print:hidden" />
          <h3 className="text-xl font-serif font-bold">Menu Lengkap Minggu {currentWeek}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onPrint}
            className="p-2 rounded-full bg-brand-primary/5 text-brand-primary hover:bg-brand-primary/10 transition-colors print:hidden"
            title="Print Menu"
          >
            <Printer size={18} />
          </button>
          <button 
            onClick={onDownloadPDF}
            disabled={isGenerating}
            className="p-2 rounded-full bg-brand-accent/5 text-brand-accent hover:bg-brand-accent/10 transition-colors print:hidden disabled:opacity-50"
            title="Download PDF"
          >
            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
          </button>
        </div>
      </div>
      <div className="space-y-3">
        {days.map(d => {
          const dayOfProgram = (currentWeek - 1) * 7 + d;
          const isFirstProteinDay = (dayOfProgram + cycleIndex) % 2 !== 0;
          const mainProtein = isFirstProteinDay ? currentProteinPair[0] : currentProteinPair[1];
          const method = cookingMethods[(dayOfProgram - 1 + cycleIndex) % cookingMethods.length];
          const veggie = vegetables[(dayOfProgram - 1 + cycleIndex) % vegetables.length];
          const isExpanded = expandedDay === d;
          const portions = getPortions(d);

          return (
            <div key={d} className="border border-brand-primary/10 rounded-xl overflow-hidden print-no-break">
              <button 
                onClick={() => setExpandedDay(isExpanded ? null : d)}
                className="w-full flex justify-between items-center p-3 bg-brand-bg/50 hover:bg-brand-bg transition-colors print:bg-white"
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-brand-secondary">Hari {d}</span>
                  <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase ${isFirstProteinDay ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                    {mainProtein} {method}
                  </span>
                </div>
                <div className="print:hidden">
                  {isExpanded ? <ChevronUp size={16} className="text-brand-primary" /> : <ChevronDown size={16} className="text-brand-secondary" />}
                </div>
              </button>
              
              <div className={`bg-white border-t border-brand-primary/5 print:block ${isExpanded ? 'block' : 'hidden'}`}>
                <div className="p-3 space-y-2 text-xs">
                  <div className="flex justify-between border-b border-brand-primary/5 pb-1">
                    <span className="font-semibold opacity-70">{shiftTime('06:30', offset)} - Sarapan</span>
                    <span>2 Telur Rebus (100g)</span>
                  </div>
                  <div className="flex justify-between border-b border-brand-primary/5 pb-1">
                    <span className="font-semibold opacity-70">{shiftTime('08:00', offset)} - Snack 1</span>
                    <span>{currentSnack1} ({portions.s1}g)</span>
                  </div>
                  <div className="flex justify-between border-b border-brand-primary/5 pb-1">
                    <span className="font-semibold opacity-70">{shiftTime('11:00', offset)} - Makan Siang</span>
                    <span className="text-right font-medium text-brand-primary">Nasi ({portions.nasi}g) + {mainProtein} ({portions.protein}g) + {veggie} (100g)</span>
                  </div>
                  <div className="flex justify-between border-b border-brand-primary/5 pb-1">
                    <span className="font-semibold opacity-70">{shiftTime('14:00', offset)} - Snack 2</span>
                    <span>{currentSnack2} ({portions.s2}g)</span>
                  </div>
                  <div className="flex justify-between border-b border-brand-primary/5 pb-1">
                    <span className="font-semibold opacity-70">{shiftTime('17:00', offset)} - Makan Malam</span>
                    {d === 7 ? (
                      <span className="text-right font-bold text-orange-500">Makan Bebas (Cheat Meal)</span>
                    ) : (
                      <span className="text-right font-medium text-brand-primary">Nasi ({portions.nasi}g) + {mainProtein} ({portions.protein}g) + {veggie} (100g)</span>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold opacity-70">{shiftTime('20:00', offset)} - Snack 3</span>
                    <span>{currentSnack3} ({portions.s3}g)</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProfileEdit({ profile, onSave, onCancel }: { profile: UserProfile, onSave: (profile: UserProfile) => void, onCancel: () => void }) {
  const [formData, setFormData] = useState<UserProfile>(profile);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-serif font-bold">Edit Profil</h3>
        <button onClick={onCancel} className="p-2 rounded-full hover:bg-brand-primary/5 transition-colors">
          <X size={24} className="text-brand-secondary" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase opacity-50">Nama Lengkap</label>
            <input 
              type="text" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full p-3 rounded-xl border border-brand-primary/10 focus:ring-2 focus:ring-brand-primary/20 outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase opacity-50">Umur</label>
              <input 
                type="number" 
                value={formData.age}
                onChange={e => setFormData({...formData, age: parseInt(e.target.value) || 0})}
                className="w-full p-3 rounded-xl border border-brand-primary/10 focus:ring-2 focus:ring-brand-primary/20 outline-none"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase opacity-50">Gender</label>
              <select 
                value={formData.gender}
                onChange={e => setFormData({...formData, gender: e.target.value as Gender})}
                className="w-full p-3 rounded-xl border border-brand-primary/10 focus:ring-2 focus:ring-brand-primary/20 outline-none"
              >
                <option value="M">Pria</option>
                <option value="F">Wanita</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase opacity-50">Tinggi (cm)</label>
              <input 
                type="number" 
                value={formData.height}
                onChange={e => setFormData({...formData, height: parseInt(e.target.value) || 0})}
                className="w-full p-3 rounded-xl border border-brand-primary/10 focus:ring-2 focus:ring-brand-primary/20 outline-none"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase opacity-50">Berat Awal (kg)</label>
              <input 
                type="number" 
                step="0.1"
                value={formData.initialWeight}
                onChange={e => setFormData({...formData, initialWeight: parseFloat(e.target.value) || 0})}
                className="w-full p-3 rounded-xl border border-brand-primary/10 focus:ring-2 focus:ring-brand-primary/20 outline-none"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase opacity-50">Level Aktivitas Harian</label>
            <select 
              value={formData.baseActivityLevel}
              onChange={e => setFormData({...formData, baseActivityLevel: parseFloat(e.target.value)})}
              className="w-full p-3 rounded-xl border border-brand-primary/10 focus:ring-2 focus:ring-brand-primary/20 outline-none"
            >
              <option value={1.2}>Sangat Jarang Olahraga (Sedentary)</option>
              <option value={1.375}>Olahraga Ringan (1-3x seminggu)</option>
              <option value={1.55}>Olahraga Sedang (3-5x seminggu)</option>
              <option value={1.725}>Olahraga Berat (6-7x seminggu)</option>
              <option value={1.9}>Atlet / Pekerja Fisik Sangat Berat</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase opacity-50">Preferensi Makronutrisi</label>
            <div className="grid grid-cols-3 gap-2">
              {(['Lower', 'Moderate', 'Higher'] as MacroType[]).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({...formData, macroPreference: type})}
                  className={`p-2 rounded-xl text-xs font-bold border-2 transition-all ${formData.macroPreference === type ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-transparent bg-brand-bg text-brand-secondary opacity-60'}`}
                >
                  {type === 'Lower' ? 'Low' : type === 'Higher' ? 'High' : 'Mod'} Carb
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-4 pt-2">
          <button 
            type="button"
            onClick={onCancel}
            className="flex-1 p-4 rounded-2xl border-2 border-brand-primary/10 font-bold text-brand-secondary hover:bg-brand-bg transition-all"
          >
            Batal
          </button>
          <button 
            type="submit"
            className="flex-1 p-4 rounded-2xl bg-brand-primary text-white font-bold hover:bg-brand-primary/90 transition-all shadow-lg shadow-brand-primary/20"
          >
            Simpan Perubahan
          </button>
        </div>
      </form>
    </motion.div>
  );
}

function ProfileView({ profile, onReset, onEdit, onSimulateDay, onDownloadPDF, onPrint, isGenerating }: { profile: UserProfile, onReset: () => void, onEdit: () => void, onSimulateDay: (days: number) => void, onDownloadPDF?: () => void, onPrint?: () => void, isGenerating?: boolean }) {
  const [showConfirm, setShowConfirm] = useState(false);

  const bmr = Math.round(calculateBMR(profile.initialWeight, profile.height, profile.age, profile.gender));
  const tdee = Math.round(calculateTDEE(bmr, profile.baseActivityLevel));
  const targetCalories = Math.round(calculateTargetCalories(tdee, bmr, profile.gender));
  const macros = calculateMacros(targetCalories, profile.macroPreference);
  const calorieDeficit = tdee - targetCalories;
  const waterIntake = Math.round((profile.initialWeight * 35) / 100) / 10; // 35ml per kg body weight
  
  // Realistic weight loss is 0.5% to 1% of body weight per week
  const minLoss = (profile.initialWeight * 0.005).toFixed(1);
  const maxLoss = (profile.initialWeight * 0.01).toFixed(1);

  // Estimated loss based on deficit (7700 kcal = 1kg fat)
  const estimatedWeeklyLoss = ((calorieDeficit * 7) / 7700).toFixed(2);
  const projectedWeight1Month = (profile.initialWeight - (parseFloat(estimatedWeeklyLoss) * 4)).toFixed(1);
  const projectedWeight3Months = (profile.initialWeight - (parseFloat(estimatedWeeklyLoss) * 12)).toFixed(1);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      id="profile-view-print"
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-serif font-bold">Profil Saya</h3>
        <div className="flex items-center gap-2">
          <button 
            onClick={onPrint}
            className="p-2 rounded-full bg-brand-primary/5 text-brand-primary hover:bg-brand-primary/10 transition-colors print:hidden"
            title="Print Profil"
          >
            <Printer size={18} />
          </button>
          <button 
            onClick={onDownloadPDF}
            disabled={isGenerating}
            className="p-2 rounded-full bg-brand-accent/5 text-brand-accent hover:bg-brand-accent/10 transition-colors print:hidden disabled:opacity-50"
            title="Download Profil PDF"
          >
            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
          </button>
        </div>
      </div>
      
      <div className="card space-y-4">
        <div className="flex justify-between border-b border-brand-primary/5 pb-2">
          <span className="text-brand-secondary text-sm">Nama</span>
          <span className="font-bold">{profile.name}</span>
        </div>
        <div className="flex justify-between border-b border-brand-primary/5 pb-2">
          <span className="text-brand-secondary text-sm">Umur</span>
          <span className="font-bold">{profile.age} Tahun</span>
        </div>
        <div className="flex justify-between border-b border-brand-primary/5 pb-2">
          <span className="text-brand-secondary text-sm">Tinggi</span>
          <span className="font-bold">{profile.height} cm</span>
        </div>
        <div className="flex justify-between border-b border-brand-primary/5 pb-2">
          <span className="text-brand-secondary text-sm">Gender</span>
          <span className="font-bold">{profile.gender === 'M' ? 'Pria' : 'Wanita'}</span>
        </div>
        <div className="flex justify-between border-b border-brand-primary/5 pb-2">
          <span className="text-brand-secondary text-sm">Berat Awal</span>
          <span className="font-bold">{profile.initialWeight.toFixed(2)} kg</span>
        </div>
        {profile.initialMeasurements && (
          <div className="pt-2 space-y-2">
            <span className="text-[10px] font-bold uppercase opacity-50 block">Lingkar Tubuh Awal</span>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-xs bg-brand-bg p-2 rounded">Perut: <b>{profile.initialMeasurements.belly} cm</b></div>
              <div className="text-xs bg-brand-bg p-2 rounded">Pinggang: <b>{profile.initialMeasurements.waist} cm</b></div>
              <div className="text-xs bg-brand-bg p-2 rounded">Pinggul: <b>{profile.initialMeasurements.hip} cm</b></div>
              <div className="text-xs bg-brand-bg p-2 rounded">Leher: <b>{profile.initialMeasurements.neck} cm</b></div>
              <div className="text-xs bg-brand-bg p-2 rounded">Lengan: <b>{profile.initialMeasurements.arm} cm</b></div>
              <div className="text-xs bg-brand-bg p-2 rounded">Paha: <b>{profile.initialMeasurements.thigh} cm</b></div>
            </div>
          </div>
        )}
      </div>

      <h3 className="text-xl font-serif font-bold pt-2">Target & Kebutuhan Harian</h3>
      <div className="card space-y-4 bg-brand-primary/5 border-brand-primary/10">
        <div className="flex justify-between border-b border-brand-primary/10 pb-2">
          <span className="text-brand-secondary text-sm">BMR (Metabolisme Dasar)</span>
          <span className="font-bold">{bmr} kcal</span>
        </div>
        <div className="flex justify-between border-b border-brand-primary/10 pb-2">
          <span className="text-brand-secondary text-sm">TDEE (Kebutuhan Total)</span>
          <span className="font-bold">{tdee} kcal</span>
        </div>
        <div className="flex justify-between border-b border-brand-primary/10 pb-2">
          <span className="text-brand-secondary text-sm">Target Kalori Diet</span>
          <span className="font-bold text-brand-primary">{targetCalories} kcal</span>
        </div>
        <div className="flex justify-between border-b border-brand-primary/10 pb-2">
          <span className="text-brand-secondary text-sm">Preferensi Makro</span>
          <span className="font-bold">{profile.macroPreference} Carb</span>
        </div>
        <div className="pt-2 space-y-3">
          <span className="text-[10px] font-bold uppercase opacity-50 block">Target Makronutrisi Harian</span>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-brand-primary/10 p-2 rounded-xl text-center">
              <span className="text-[10px] block opacity-60">Protein</span>
              <span className="font-bold text-brand-primary">{macros.protein}g</span>
            </div>
            <div className="bg-brand-accent/10 p-2 rounded-xl text-center">
              <span className="text-[10px] block opacity-60">Lemak</span>
              <span className="font-bold text-brand-accent">{macros.fat}g</span>
            </div>
            <div className="bg-blue-50 p-2 rounded-xl text-center">
              <span className="text-[10px] block opacity-60">Karbo</span>
              <span className="font-bold text-blue-600">{macros.carbs}g</span>
            </div>
          </div>
        </div>
        <div className="flex justify-between border-b border-brand-primary/10 pb-2">
          <span className="text-brand-secondary text-sm">Defisit Kalori</span>
          <span className="font-bold text-red-500">-{calorieDeficit} kcal</span>
        </div>
        <div className="flex justify-between border-b border-brand-primary/10 pb-2">
          <span className="text-brand-secondary text-sm">Kebutuhan Air Minum</span>
          <span className="font-bold text-blue-500">{waterIntake} Liter</span>
        </div>
        <div className="flex justify-between pt-1">
          <span className="text-brand-secondary text-sm">Kebutuhan Olahraga</span>
          <span className="font-bold text-right text-xs max-w-[150px]">3-5x seminggu<br/>(30-45 mnt Kardio/Beban)</span>
        </div>
      </div>

      <div className="text-xs text-brand-secondary bg-brand-bg p-3 rounded-xl border border-brand-primary/5 space-y-2">
        <p><span className="font-bold">BMR:</span> Kalori yang dibakar tubuh saat istirahat total.</p>
        <p><span className="font-bold">TDEE:</span> Total kalori yang dibakar tubuh berdasarkan aktivitas harian.</p>
        <p><span className="font-bold">Defisit Kalori:</span> Pengurangan kalori dari TDEE untuk menurunkan berat badan dengan aman (maksimal -500 kcal).</p>
      </div>

      <div className="card space-y-3 bg-green-50 border-green-100">
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle2 size={16} />
          <h4 className="font-bold text-sm">Mengapa Diet Ini Aman?</h4>
        </div>
        <ul className="text-xs text-green-800 space-y-2 list-disc pl-4">
          <li><span className="font-bold">Defisit Moderat:</span> Pemotongan kalori maksimal 500 kcal/hari (tidak ekstrem) untuk mencegah metabolisme melambat.</li>
          <li><span className="font-bold">Nutrisi Seimbang:</span> Tetap makan nasi (karbo) untuk energi, dan tinggi protein (ayam/ikan) untuk menjaga massa otot.</li>
          <li><span className="font-bold">Fase Santuy:</span> Adanya diet break/fase santuy mencegah stres psikologis dan adaptasi metabolik.</li>
          <li><span className="font-bold">Hidrasi Cukup:</span> Target minum air disesuaikan spesifik dengan berat badan Anda.</li>
        </ul>
      </div>

      <div className="card space-y-3 bg-blue-50 border-blue-100">
        <div className="flex items-center gap-2 text-blue-700">
          <Target size={16} />
          <h4 className="font-bold text-sm">Target & Ekspektasi Personal</h4>
        </div>
        <ul className="text-xs text-blue-800 space-y-4 list-disc pl-4">
          <li>
            <span className="font-bold">Estimasi Penurunan Lemak:</span> Dengan defisit <span className="font-bold">{calorieDeficit} kcal/hari</span>, estimasi penurunan lemak murni Anda adalah sekitar <span className="font-bold">{estimatedWeeklyLoss} kg per minggu</span>.
            <p className="mt-1 opacity-80 italic">Catatan: Angka ini adalah estimasi matematis. Hasil nyata dipengaruhi oleh retensi air, massa otot, dan kepatuhan diet.</p>
          </li>
          <li>
            <span className="font-bold">Batas Aman (Safe Range):</span> Berdasarkan berat badan Anda, batas penurunan yang sehat adalah <span className="font-bold">{minLoss} - {maxLoss} kg per minggu</span>. Estimasi Anda saat ini berada dalam zona aman.
          </li>
          <li>
            <span className="font-bold">Proyeksi Berat Badan:</span>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="bg-white/50 p-2 rounded-lg border border-blue-200">
                <span className="block opacity-60 text-[10px] uppercase font-bold">Setelah 1 Bulan</span>
                <span className="text-lg font-serif font-bold text-blue-700">{projectedWeight1Month} kg</span>
              </div>
              <div className="bg-white/50 p-2 rounded-lg border border-blue-200">
                <span className="block opacity-60 text-[10px] uppercase font-bold">Setelah 3 Bulan</span>
                <span className="text-lg font-serif font-bold text-blue-700">{projectedWeight3Months} kg</span>
              </div>
            </div>
            <p className="mt-2 opacity-80">Penurunan drastis melebihi batas aman berisiko menghilangkan massa otot dan menyebabkan efek yoyo.</p>
          </li>
          <li>
            <span className="font-bold">Pentingnya Olahraga (Booster Diet):</span>
            <p className="mt-1">
              Diet (defisit kalori) itu seperti mematikan keran air supaya bak tidak penuh, tapi <span className="font-bold">olahraga adalah mesin pompa yang menguras air (lemak) jauh lebih cepat</span>. 
            </p>
            <p className="mt-2">
              Kombinasi diet dan olahraga terbukti paling efektif karena:
            </p>
            <ul className="list-disc pl-4 mt-1 space-y-1 opacity-90">
              <li><span className="font-bold">Metabolisme Ngebut:</span> Olahraga menjaga massa otot. Makin banyak otot, makin banyak kalori yang dibakar tubuh bahkan saat tidur!</li>
              <li><span className="font-bold">Bakar Lemak Lebih Cepat:</span> Olahraga menciptakan defisit tambahan tanpa harus mengurangi makan secara ekstrem.</li>
              <li><span className="font-bold">Badan Kencang:</span> Tanpa olahraga, Anda berisiko menjadi "skinny fat" (berat turun tapi badan lembek).</li>
            </ul>
          </li>
        </ul>
      </div>

      <div className="card space-y-3 bg-blue-50 border-blue-100">
        <div className="flex items-center gap-2 text-blue-700">
          <Clock size={16} />
          <h4 className="font-bold text-sm">Pentingnya Tidur Cukup</h4>
        </div>
        <div className="text-xs text-blue-800 space-y-2">
          <p>
            Tidur 7-9 jam per malam sangat krusial untuk:
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li><span className="font-bold">Regulasi Hormon:</span> Menyeimbangkan hormon leptin (kenyang) dan ghrelin (lapar). Kurang tidur memicu rasa lapar berlebih.</li>
            <li><span className="font-bold">Pemulihan Otot:</span> Proses perbaikan jaringan otot terjadi maksimal saat tidur nyenyak.</li>
            <li><span className="font-bold">Metabolisme Optimal:</span> Tidur cukup menjaga sensitivitas insulin dan pembakaran lemak tetap efisien.</li>
          </ul>
          <p className="italic opacity-80">
            Kurang tidur dapat meningkatkan keinginan makan makanan manis dan berlemak tinggi (craving).
          </p>
        </div>
      </div>

      <div className="card space-y-3 bg-orange-50 border-orange-100">
        <div className="flex items-center gap-2 text-orange-700">
          <ShoppingBag size={16} />
          <h4 className="font-bold text-sm">Peralatan Wajib Diet</h4>
        </div>
        <ul className="text-xs text-orange-800 space-y-3 list-disc pl-4">
          <li>
            <div className="flex items-center gap-1.5 font-bold mb-0.5"><Scale size={12} /> Timbangan Makanan Digital</div>
            Kunci sukses defisit kalori. Menimbang makanan mentah/matang jauh lebih akurat daripada takaran sendok atau mangkok.
          </li>
          <li>
            <div className="flex items-center gap-1.5 font-bold mb-0.5"><Weight size={12} /> Timbangan Badan Digital</div>
            Untuk memantau berat badan dengan akurat. Hindari timbangan jarum karena kurang presisi. Timbanglah di pagi hari setelah BAB dan sebelum makan/minum.
          </li>
          <li>
            <div className="flex items-center gap-1.5 font-bold mb-0.5"><Ruler size={12} /> Pita Meteran (Measuring Tape)</div>
            Untuk mengukur lingkar tubuh (perut, paha, lengan). Kadang berat badan tidak turun (karena massa otot bertambah), tapi lingkar tubuh menyusut (fat loss).
          </li>
        </ul>
      </div>

      <div className="card space-y-3 bg-purple-50 border-purple-100">
        <div className="flex items-center gap-2 text-purple-700">
          <Clock size={16} />
          <h4 className="font-bold text-sm">Simulasi Waktu (Dev Tools)</h4>
        </div>
        <p className="text-xs text-purple-800">
          Gunakan tombol di bawah untuk mensimulasikan perjalanan waktu agar Anda bisa melihat tampilan Hari ke-2 hingga ke-14, serta notifikasi Check-in Mingguan.
        </p>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <button 
            onClick={() => onSimulateDay(1)}
            className="p-2 bg-white border border-purple-200 rounded-lg text-xs font-bold text-purple-700 hover:bg-purple-100"
          >
            +1 Hari (Besok)
          </button>
          <button 
            onClick={() => onSimulateDay(7)}
            className="p-2 bg-white border border-purple-200 rounded-lg text-xs font-bold text-purple-700 hover:bg-purple-100"
          >
            +7 Hari (Minggu 2)
          </button>
          <button 
            onClick={() => onSimulateDay(14)}
            className="p-2 bg-white border border-purple-200 rounded-lg text-xs font-bold text-purple-700 hover:bg-purple-100"
          >
            +14 Hari (Minggu 3)
          </button>
          <button 
            onClick={() => onSimulateDay(0)}
            className="p-2 bg-white border border-purple-200 rounded-lg text-xs font-bold text-purple-700 hover:bg-purple-100"
          >
            Reset ke Hari 1
          </button>
        </div>
      </div>

      {!showConfirm ? (
        <div className="space-y-3">
          <button 
            onClick={onEdit}
            className="w-full p-4 rounded-2xl bg-brand-primary text-white font-bold flex items-center justify-center gap-2 hover:bg-brand-primary/90 transition-all shadow-lg shadow-brand-primary/20"
          >
            <Edit size={20} />
            Edit Profil
          </button>
          <button 
            onClick={() => setShowConfirm(true)}
            className="w-full p-4 rounded-2xl border-2 border-red-500 text-red-500 font-bold hover:bg-red-500 hover:text-white transition-all"
          >
            Reset Profil & Data
          </button>
        </div>
      ) : (
        <div className="card border-red-500 bg-red-50 space-y-4">
          <p className="text-sm text-red-700 font-bold text-center">
            Apakah Anda yakin ingin menghapus semua data? Tindakan ini tidak bisa dibatalkan.
          </p>
          <div className="flex gap-4">
            <button 
              onClick={() => setShowConfirm(false)}
              className="flex-1 p-3 rounded-xl bg-white border border-brand-primary/10 text-sm font-bold"
            >
              Batal
            </button>
            <button 
              onClick={onReset}
              className="flex-1 p-3 rounded-xl bg-red-500 text-white text-sm font-bold"
            >
              Ya, Reset
            </button>
          </div>
        </div>
      )}

      <div className="mt-8 pt-4 border-t border-brand-primary/5 text-center opacity-40">
        <p className="text-[10px] font-medium text-brand-secondary">
          Dikembangkan oleh Okke Huriah Rachmah. V.1.1
        </p>
      </div>
    </motion.div>
  );
}

function ProgressView({ checkIns, initialWeight, onDownloadPDF, onPrint, isGenerating }: { checkIns: WeeklyCheckIn[], initialWeight: number, onDownloadPDF?: () => void, onPrint?: () => void, isGenerating?: boolean }) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      id="progress-view-print"
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-serif font-bold">Progres Dietmu</h3>
        <div className="flex items-center gap-2">
          <button 
            onClick={onPrint}
            className="p-2 rounded-full bg-brand-primary/5 text-brand-primary hover:bg-brand-primary/10 transition-colors print:hidden"
            title="Print Progres"
          >
            <Printer size={18} />
          </button>
          <button 
            onClick={onDownloadPDF}
            disabled={isGenerating}
            className="p-2 rounded-full bg-brand-accent/5 text-brand-accent hover:bg-brand-accent/10 transition-colors print:hidden disabled:opacity-50"
            title="Download Progres PDF"
          >
            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="card text-center">
          <span className="block text-[10px] font-bold uppercase opacity-50 mb-1">Berat Awal</span>
          <span className="text-2xl font-bold">{initialWeight.toFixed(2)} kg</span>
        </div>
        <div className="card text-center">
          <span className="block text-[10px] font-bold uppercase opacity-50 mb-1">Berat Sekarang</span>
          <span className="text-2xl font-bold">{checkIns[checkIns.length - 1].weight.toFixed(2)} kg</span>
        </div>
      </div>

      <div className="card">
        <h4 className="font-bold text-sm mb-4">Riwayat Mingguan</h4>
        <div className="space-y-4">
          {checkIns.map((c, i) => (
            <div key={i} className="flex justify-between items-center border-b border-brand-primary/5 pb-2">
              <div>
                <span className="block font-bold">Minggu {c.weekNumber}</span>
                <span className="text-[10px] text-brand-secondary">{new Date(c.date).toLocaleDateString('id-ID')}</span>
              </div>
              <div className="text-right">
                <span className="block font-bold">{c.weight.toFixed(2)} kg</span>
                {i > 0 && (
                  <span className={`text-[10px] font-bold ${c.weight < checkIns[i-1].weight ? 'text-green-500' : 'text-red-500'}`}>
                    {c.weight < checkIns[i-1].weight ? '↓' : '↑'} {Math.abs(c.weight - checkIns[i-1].weight).toFixed(2)} kg
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

const BodyMeasurementGuide = () => (
  <div className="relative w-full max-w-[220px] mx-auto aspect-[1/2] bg-brand-primary/5 rounded-xl flex items-center justify-center overflow-hidden border border-brand-primary/10 my-4">
    {/* Human silhouette SVG */}
    <svg viewBox="0 0 100 200" className="w-full h-full text-brand-primary/20" fill="currentColor">
      {/* Head */}
      <circle cx="50" cy="20" r="13" />
      {/* Neck */}
      <rect x="45" y="30" width="10" height="15" rx="2" />
      {/* Torso */}
      <path d="M28 45 Q50 40 72 45 L65 90 Q50 95 35 90 Z" />
      {/* Pelvis/Hips */}
      <path d="M35 89 Q50 95 65 89 L68 110 Q50 120 32 110 Z" />
      {/* Arms */}
      <path d="M28 45 Q15 75 20 110" stroke="currentColor" strokeWidth="11" strokeLinecap="round" fill="none" />
      <path d="M72 45 Q85 75 80 110" stroke="currentColor" strokeWidth="11" strokeLinecap="round" fill="none" />
      {/* Legs */}
      <path d="M38 105 L35 180" stroke="currentColor" strokeWidth="15" strokeLinecap="round" fill="none" />
      <path d="M62 105 L65 180" stroke="currentColor" strokeWidth="15" strokeLinecap="round" fill="none" />
    </svg>

    {/* Measurement Lines */}
    {/* Leher */}
    <div className="absolute top-[17%] left-0 w-full flex items-center px-4">
      <div className="flex-1 border-t border-dashed border-brand-primary"></div>
      <span className="text-[9px] font-bold text-brand-primary bg-white px-1.5 py-0.5 rounded shadow-sm mx-2">Leher</span>
      <div className="flex-1 border-t border-dashed border-brand-primary"></div>
    </div>
    
    {/* Lengan */}
    <div className="absolute top-[37%] left-0 w-full flex items-center px-4">
      <span className="text-[9px] font-bold text-brand-primary bg-white px-1.5 py-0.5 rounded shadow-sm mr-2">Lengan</span>
      <div className="flex-1 border-t border-dashed border-brand-primary"></div>
    </div>

    {/* Pinggang */}
    <div className="absolute top-[43%] left-0 w-full flex items-center px-4">
      <div className="flex-1 border-t border-dashed border-brand-primary"></div>
      <span className="text-[9px] font-bold text-brand-primary bg-white px-1.5 py-0.5 rounded shadow-sm ml-2">Pinggang</span>
    </div>

    {/* Perut */}
    <div className="absolute top-[49%] left-0 w-full flex items-center px-4">
      <span className="text-[9px] font-bold text-brand-primary bg-white px-1.5 py-0.5 rounded shadow-sm mr-2">Perut</span>
      <div className="flex-1 border-t border-dashed border-brand-primary"></div>
    </div>

    {/* Pinggul */}
    <div className="absolute top-[56%] left-0 w-full flex items-center px-4">
      <div className="flex-1 border-t border-dashed border-brand-primary"></div>
      <span className="text-[9px] font-bold text-brand-primary bg-white px-1.5 py-0.5 rounded shadow-sm ml-2">Pinggul</span>
    </div>

    {/* Paha */}
    <div className="absolute top-[68%] left-0 w-full flex items-center px-4">
      <div className="flex-1 border-t border-dashed border-brand-primary"></div>
      <span className="text-[9px] font-bold text-brand-primary bg-white px-1.5 py-0.5 rounded shadow-sm mx-2">Paha</span>
      <div className="flex-1 border-t border-dashed border-brand-primary"></div>
    </div>
  </div>
);

function ProfileSetup({ onSubmit }: { onSubmit: (p: UserProfile) => void }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    gender: 'F',
    baseActivityLevel: 1.2,
    macroPreference: 'Moderate',
    initialMeasurements: {
      belly: 0,
      waist: 0,
      hip: 0,
      neck: 0,
      arm: 0,
      thigh: 0
    }
  });

  const next = () => setStep(s => s + 1);

  const updateMeasurement = (key: string, val: number) => {
    setFormData(prev => ({
      ...prev,
      initialMeasurements: {
        ...prev.initialMeasurements!,
        [key]: val
      }
    }));
  };

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col justify-center px-8 py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="space-y-2">
          <h1 className="text-4xl font-serif font-bold tracking-tight">Sehat Santuy Selalu</h1>
          <p className="text-brand-secondary">Mari mulai perjalanan dietmu dengan santuy.</p>
          <div className="bg-orange-50 border border-orange-200 p-3 rounded-xl flex items-start gap-2">
            <AlertTriangle size={16} className="text-orange-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-orange-700 font-medium">
              Penting: Pastikan Anda menyimpan data setelah mengisi formulir ini agar progres Anda tercatat dengan benar.
            </p>
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-4">
              <label className="block text-sm font-semibold uppercase tracking-wider opacity-60">Siapa Namamu?</label>
              <input 
                type="text" 
                className="w-full bg-transparent border-b-2 border-brand-primary py-2 text-2xl focus:outline-none"
                placeholder="Nama Anda"
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <button 
              disabled={!formData.name}
              onClick={next} 
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              Lanjut <ArrowRight size={18} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setFormData({ ...formData, gender: 'M' })}
                className={`p-6 rounded-3xl border-2 transition-all ${formData.gender === 'M' ? 'border-brand-primary bg-brand-primary text-white' : 'border-brand-primary/10'}`}
              >
                <User className="mx-auto mb-2" />
                <span className="font-bold">Pria</span>
              </button>
              <button 
                onClick={() => setFormData({ ...formData, gender: 'F' })}
                className={`p-6 rounded-3xl border-2 transition-all ${formData.gender === 'F' ? 'border-brand-primary bg-brand-primary text-white' : 'border-brand-primary/10'}`}
              >
                <User className="mx-auto mb-2" />
                <span className="font-bold">Wanita</span>
              </button>
            </div>
            <div className="space-y-4">
              <label className="block text-sm font-semibold uppercase tracking-wider opacity-60">Umur</label>
              <input 
                type="number" 
                className="w-full bg-transparent border-b-2 border-brand-primary py-2 text-2xl focus:outline-none"
                placeholder="25"
                onChange={e => setFormData({ ...formData, age: Number(e.target.value) })}
              />
            </div>
            <button 
              disabled={!formData.age}
              onClick={next} 
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              Lanjut <ArrowRight size={18} />
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-4">
              <label className="block text-sm font-semibold uppercase tracking-wider opacity-60">Tinggi Badan (cm)</label>
              <input 
                type="number" 
                className="w-full bg-transparent border-b-2 border-brand-primary py-2 text-2xl focus:outline-none"
                placeholder="170"
                onChange={e => setFormData({ ...formData, height: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-4">
              <label className="block text-sm font-semibold uppercase tracking-wider opacity-60">Berat Badan Saat Ini (kg)</label>
              <input 
                type="number" 
                step="0.01"
                className="w-full bg-transparent border-b-2 border-brand-primary py-2 text-2xl focus:outline-none"
                placeholder="70"
                onChange={e => setFormData({ ...formData, initialWeight: Number(e.target.value) })}
              />
            </div>
            <button 
              disabled={!formData.height || !formData.initialWeight}
              onClick={next} 
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              Lanjut <ArrowRight size={18} />
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div className="space-y-4">
              <label className="block text-sm font-semibold uppercase tracking-wider opacity-60">Tingkat Aktivitas Mingguan</label>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { val: 1.2, label: 'Sedentary', desc: 'Sedikit/Tidak ada olahraga' },
                  { val: 1.375, label: 'Lightly Active', desc: 'Olahraga 1-3 hari/minggu' },
                  { val: 1.55, label: 'Moderately Active', desc: 'Olahraga 3-5 hari/minggu' },
                  { val: 1.725, label: 'Very Active', desc: 'Olahraga 6-7 hari/minggu' },
                  { val: 1.9, label: 'Extra Active', desc: 'Olahraga berat/fisik 2x sehari' },
                ].map((act) => (
                  <button
                    key={act.val}
                    onClick={() => setFormData({ ...formData, baseActivityLevel: act.val })}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${formData.baseActivityLevel === act.val ? 'border-brand-primary bg-brand-primary/5' : 'border-brand-primary/10'}`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold">{act.label}</span>
                      <span className="text-[10px] opacity-60">x{act.val}</span>
                    </div>
                    <p className="text-xs opacity-70">{act.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <button 
              onClick={next} 
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              Lanjut <ArrowRight size={18} />
            </button>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <div className="space-y-4">
              <label className="block text-sm font-semibold uppercase tracking-wider opacity-60">Preferensi Makronutrisi</label>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { val: 'Moderate', label: 'Moderate Carb', desc: '30% Protein, 35% Lemak, 35% Karbo' },
                  { val: 'Lower', label: 'Lower Carb', desc: '40% Protein, 40% Lemak, 20% Karbo' },
                  { val: 'Higher', label: 'Higher Carb', desc: '30% Protein, 20% Lemak, 50% Karbo' },
                ].map((macro) => (
                  <button
                    key={macro.val}
                    onClick={() => setFormData({ ...formData, macroPreference: macro.val as any })}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${formData.macroPreference === macro.val ? 'border-brand-primary bg-brand-primary/5' : 'border-brand-primary/10'}`}
                  >
                    <span className="font-bold block">{macro.label}</span>
                    <p className="text-xs opacity-70">{macro.desc}</p>
                  </button>
                ))}
              </div>
              <p className="text-[10px] opacity-60 italic">*Berdasarkan standar TDEE Calculator untuk cutting/maintenance.</p>
            </div>
            <button 
              onClick={next} 
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              Lanjut <ArrowRight size={18} />
            </button>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-6">
            <h3 className="text-xl font-serif font-bold">Lingkar Tubuh Awal</h3>
            <BodyMeasurementGuide />
            <div className="text-xs text-brand-secondary space-y-2 bg-brand-primary/5 p-3 rounded-xl border border-brand-primary/10">
              <p className="font-bold text-brand-primary">Panduan Pengukuran:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><span className="font-bold">Perut:</span> Sejajar pusar (Batas aman: Wanita &lt; 80cm, Pria &lt; 90cm)</li>
                <li><span className="font-bold">Pinggang:</span> Antara tulang rusuk terbawah & tulang pinggang</li>
                <li><span className="font-bold">Pinggul:</span> Bagian terlebar pantat</li>
                <li><span className="font-bold">Leher:</span> Di bawah jakun (pria) / tengah leher (wanita)</li>
                <li><span className="font-bold">Lengan:</span> Bagian tengah lengan atas</li>
                <li><span className="font-bold">Paha:</span> Bagian tengah paha atas</li>
              </ul>
              <p className="mt-2 italic opacity-80">Berdiri tegak, jangan menahan napas, dan pastikan pita pengukur tidak terlalu kencang/longgar.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase opacity-60">Perut (cm)</label>
                <input 
                  type="number" 
                  className="w-full bg-transparent border-b border-brand-primary py-1 focus:outline-none"
                  placeholder="0"
                  onChange={e => updateMeasurement('belly', Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase opacity-60">Pinggang (cm)</label>
                <input 
                  type="number" 
                  className="w-full bg-transparent border-b border-brand-primary py-1 focus:outline-none"
                  placeholder="0"
                  onChange={e => updateMeasurement('waist', Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase opacity-60">Pinggul (cm)</label>
                <input 
                  type="number" 
                  className="w-full bg-transparent border-b border-brand-primary py-1 focus:outline-none"
                  placeholder="0"
                  onChange={e => updateMeasurement('hip', Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase opacity-60">Leher (cm)</label>
                <input 
                  type="number" 
                  className="w-full bg-transparent border-b border-brand-primary py-1 focus:outline-none"
                  placeholder="0"
                  onChange={e => updateMeasurement('neck', Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase opacity-60">Lengan (cm)</label>
                <input 
                  type="number" 
                  className="w-full bg-transparent border-b border-brand-primary py-1 focus:outline-none"
                  placeholder="0"
                  onChange={e => updateMeasurement('arm', Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase opacity-60">Paha (cm)</label>
                <input 
                  type="number" 
                  className="w-full bg-transparent border-b border-brand-primary py-1 focus:outline-none"
                  placeholder="0"
                  onChange={e => updateMeasurement('thigh', Number(e.target.value))}
                />
              </div>
            </div>

            <button 
              onClick={() => onSubmit(formData as UserProfile)} 
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              Mulai Program <CheckCircle2 size={18} />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function WeeklyCheckInView({ weekNumber, onSubmit }: { weekNumber: number, onSubmit: (w: number, m: any) => void }) {
  const [weight, setWeight] = useState<number | ''>('');
  const [measurements, setMeasurements] = useState({ belly: '', waist: '', hip: '', neck: '', arm: '', thigh: '' });

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col justify-center px-8 py-12">
      <div className="space-y-8">
        <div className="space-y-2">
          <span className="text-brand-accent font-bold uppercase tracking-widest text-xs">Check-in Mingguan</span>
          <h1 className="text-4xl font-serif font-bold tracking-tight">Minggu ke-{weekNumber}</h1>
          <p className="text-brand-secondary">Waktunya evaluasi progresmu minggu ini.</p>
          <div className="bg-orange-50 border border-orange-200 p-3 rounded-xl flex items-start gap-2">
            <AlertTriangle size={16} className="text-orange-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-orange-700 font-medium">
              Penting: Pastikan Anda menyimpan data setelah mengisi formulir ini agar progres Anda tercatat dengan benar.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <label className="block text-sm font-semibold uppercase tracking-wider opacity-60">Berat Badan (kg)</label>
            <input 
              type="number" 
              step="0.01"
              className="w-full bg-transparent border-b-2 border-brand-primary py-2 text-2xl focus:outline-none"
              placeholder="0.00"
              value={weight}
              onChange={e => setWeight(Number(e.target.value))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase opacity-50">Perut (cm)</label>
              <input 
                type="number" 
                className="w-full bg-transparent border-b border-brand-primary py-1 focus:outline-none"
                placeholder="0"
                value={measurements.belly}
                onChange={e => setMeasurements({ ...measurements, belly: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase opacity-50">Pinggang (cm)</label>
              <input 
                type="number" 
                className="w-full bg-transparent border-b border-brand-primary py-1 focus:outline-none"
                placeholder="0"
                value={measurements.waist}
                onChange={e => setMeasurements({ ...measurements, waist: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase opacity-50">Pinggul (cm)</label>
              <input 
                type="number" 
                className="w-full bg-transparent border-b border-brand-primary py-1 focus:outline-none"
                placeholder="0"
                value={measurements.hip}
                onChange={e => setMeasurements({ ...measurements, hip: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase opacity-50">Leher (cm)</label>
              <input 
                type="number" 
                className="w-full bg-transparent border-b border-brand-primary py-1 focus:outline-none"
                placeholder="0"
                value={measurements.neck}
                onChange={e => setMeasurements({ ...measurements, neck: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase opacity-50">Lengan (cm)</label>
              <input 
                type="number" 
                className="w-full bg-transparent border-b border-brand-primary py-1 focus:outline-none"
                placeholder="0"
                value={measurements.arm}
                onChange={e => setMeasurements({ ...measurements, arm: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase opacity-50">Paha (cm)</label>
              <input 
                type="number" 
                className="w-full bg-transparent border-b border-brand-primary py-1 focus:outline-none"
                placeholder="0"
                value={measurements.thigh}
                onChange={e => setMeasurements({ ...measurements, thigh: e.target.value })}
              />
            </div>
          </div>

          <button 
            disabled={!weight}
            onClick={() => onSubmit(Number(weight), {
              belly: measurements.belly ? Number(measurements.belly) : undefined,
              waist: measurements.waist ? Number(measurements.waist) : undefined,
              hip: measurements.hip ? Number(measurements.hip) : undefined,
              neck: measurements.neck ? Number(measurements.neck) : undefined,
              arm: measurements.arm ? Number(measurements.arm) : undefined,
              thigh: measurements.thigh ? Number(measurements.thigh) : undefined,
            })} 
            className="btn-primary w-full"
          >
            Simpan Data & Lanjut
          </button>
        </div>
      </div>
    </div>
  );
}

function PrintHeader({ week, day, phase }: { week: number, day: number, phase: Phase }) {
  return (
    <div id="print-header-content" className="hidden print:block mb-8 border-b-2 border-brand-primary pb-4">
      <h1 className="text-4xl font-serif font-bold text-brand-primary">Sehat Santuy Selalu</h1>
      <div className="flex justify-between items-end mt-2">
        <div>
          <p className="text-brand-secondary text-sm font-medium uppercase tracking-widest">Minggu {week} • Hari {day}</p>
          <p className="text-xs text-brand-secondary mt-1 italic">Dikembangkan oleh Okke Huriah Rachmah. V.1.1</p>
        </div>
        <div className="bg-brand-accent/10 px-4 py-2 rounded-2xl border border-brand-accent/20">
          <span className="text-brand-accent font-bold text-xs uppercase tracking-wider">{phase}</span>
        </div>
      </div>
    </div>
  );
}

function Header({ week, day, phase, className = "" }: { week: number, day: number, phase: Phase, className?: string }) {
  return (
    <div className={`flex justify-between items-end mb-8 ${className}`}>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${phase === 'Strict' ? 'bg-brand-primary text-white' : 'bg-brand-accent text-white'}`}>
            {phase} Phase
          </span>
          <span className="text-brand-secondary text-[10px] font-bold uppercase tracking-wider">
            Minggu {week}, Hari {day}
          </span>
        </div>
        <h2 className="text-3xl font-serif font-bold">Halo, Santuyers!</h2>
      </div>
      <div className="w-12 h-12 rounded-full bg-brand-primary/5 flex items-center justify-center">
        <User size={20} />
      </div>
    </div>
  );
}

const EXERCISE_METS: Record<string, number> = {
  'Jalan Kaki (Santai)': 3.0,
  'Jalan Kaki (Cepat)': 4.3,
  'Lari': 8.0,
  'Bersepeda': 6.0,
  'Senam/Zumba': 6.5,
  'Angkat Beban': 3.5,
  'Renang': 6.0,
};

function DailyTracker({ log, onUpdate, weight, onDownloadPDF, onPrint, isGenerating, className = "" }: { log: DailyLog, onUpdate: (updates: Partial<DailyLog>) => void, weight: number, onDownloadPDF?: () => void, onPrint?: () => void, isGenerating?: boolean, className?: string }) {
  const [exerciseType, setExerciseType] = useState<string>('Jalan Kaki (Santai)');
  const [exerciseMinutes, setExerciseMinutes] = useState<number>(30);

  const handleAddExercise = () => {
    const met = EXERCISE_METS[exerciseType] || 3.0;
    const hours = exerciseMinutes / 60;
    const caloriesBurned = Math.round(met * weight * hours);
    
    onUpdate({
      exercise: {
        type: exerciseType,
        minutes: exerciseMinutes,
        caloriesBurned
      }
    });
  };

  const handleClearExercise = () => {
    onUpdate({ exercise: undefined });
  };

  const waterIntake = log.waterIntake || 0;
  const WATER_TARGET = 2000; // 2 Liters

  const handleAddWater = (amount: number) => {
    onUpdate({ waterIntake: Math.max(0, waterIntake + amount) });
  };

  return (
    <div id="daily-tracker-print" className={`space-y-4 ${className}`}>
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-serif font-bold">Tracker Hari Ini</h3>
        <div className="flex items-center gap-2">
          <div className="bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-lg flex items-center gap-2 mr-2">
            <AlertTriangle size={14} className="text-orange-500" />
            <span className="text-[9px] text-orange-700 font-bold">Simpan setelah mengisi data</span>
          </div>
          <button 
            onClick={onPrint}
            className="p-2 rounded-full bg-brand-primary/5 text-brand-primary hover:bg-brand-primary/10 transition-colors print:hidden"
            title="Print Tracker"
          >
            <Printer size={18} />
          </button>
          <button 
            onClick={onDownloadPDF}
            disabled={isGenerating}
            className="p-2 rounded-full bg-brand-accent/5 text-brand-accent hover:bg-brand-accent/10 transition-colors print:hidden disabled:opacity-50"
            title="Download Tracker PDF"
          >
            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
          </button>
        </div>
      </div>
      {/* Exercise Tracker */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Flame size={18} className="text-brand-accent" />
          <h3 className="text-xl font-serif font-bold">Aktivitas Olahraga</h3>
        </div>
        
        {log.exercise ? (
          <div className="bg-brand-primary/5 p-4 rounded-xl border border-brand-primary/10 flex justify-between items-center">
            <div>
              <p className="font-bold text-brand-primary">{log.exercise.type}</p>
              <p className="text-xs text-brand-secondary">{log.exercise.minutes} menit</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-brand-accent">{log.exercise.caloriesBurned} kcal</p>
              <button 
                onClick={handleClearExercise}
                className="text-[10px] text-brand-secondary underline mt-1"
              >
                Hapus
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase opacity-60">Jenis Olahraga</label>
                <select 
                  className="w-full bg-transparent border-b border-brand-primary py-1 focus:outline-none text-sm"
                  value={exerciseType}
                  onChange={(e) => setExerciseType(e.target.value)}
                >
                  {Object.keys(EXERCISE_METS).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase opacity-60">Durasi (Menit)</label>
                <input 
                  type="number" 
                  className="w-full bg-transparent border-b border-brand-primary py-1 focus:outline-none text-sm"
                  value={exerciseMinutes}
                  onChange={(e) => setExerciseMinutes(Number(e.target.value))}
                  min="1"
                />
              </div>
            </div>
            <button 
              onClick={handleAddExercise}
              className="btn-outline w-full py-2 text-sm"
            >
              Catat Olahraga
            </button>
          </div>
        )}
      </div>

      {/* Water Tracker */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Droplets size={18} className="text-blue-500" />
          <h3 className="text-xl font-serif font-bold">Target Minum Harian</h3>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <div>
              <span className="text-2xl font-bold text-blue-600">{waterIntake}</span>
              <span className="text-sm text-brand-secondary"> / {WATER_TARGET} ml</span>
            </div>
            <span className="text-xs font-bold text-brand-secondary bg-brand-primary/5 px-2 py-1 rounded">
              {Math.round((waterIntake / WATER_TARGET) * 100)}%
            </span>
          </div>
          
          <div className="w-full h-3 bg-brand-primary/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-500"
              style={{ width: `${Math.min(100, (waterIntake / WATER_TARGET) * 100)}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between pt-2">
            <button 
              onClick={() => handleAddWater(-250)}
              className="w-10 h-10 rounded-full bg-brand-primary/5 flex items-center justify-center text-brand-primary hover:bg-brand-primary/10 transition-colors"
              disabled={waterIntake <= 0}
            >
              <Minus size={16} />
            </button>
            <div className="text-center">
              <p className="text-xs font-bold text-brand-primary">+250 ml</p>
              <p className="text-[10px] text-brand-secondary">(1 Gelas)</p>
            </div>
            <button 
              onClick={() => handleAddWater(250)}
              className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 hover:bg-blue-100 transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
          
          <AnimatePresence>
            {waterIntake >= WATER_TARGET && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-green-50 text-green-700 text-xs p-3 rounded-lg text-center font-bold mt-2 border border-green-200"
              >
                🎉 Mantap! Target cairan hari ini sudah tercapai. Tubuhmu berterima kasih!
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-[10px] text-brand-secondary text-center italic opacity-80 pt-2">
            *Termasuk kuah makanan, teh tanpa gula, kopi hitam, dll.
          </p>
        </div>
      </div>
    </div>
  );
}

function DailyActivityPrompt({ onSelect }: { onSelect: (a: ActivityLevel) => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card space-y-6"
    >
      <div className="flex items-center gap-3">
        <Activity className="text-brand-accent" />
        <h3 className="text-xl font-serif font-bold">Aktivitas Hari Ini?</h3>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => onSelect('Rest Day')}
          className="p-4 rounded-2xl border border-brand-primary/10 hover:bg-brand-primary hover:text-white transition-all text-center"
        >
          <span className="block font-bold">Rest Day</span>
          <span className="text-[10px] opacity-60">Santai sejenak</span>
        </button>
        <button 
          onClick={() => onSelect('Active Day')}
          className="p-4 rounded-2xl border border-brand-primary/10 hover:bg-brand-primary hover:text-white transition-all text-center"
        >
          <span className="block font-bold">Active Day</span>
          <span className="text-[10px] opacity-60">Olahraga/Aktif</span>
        </button>
      </div>
    </motion.div>
  );
}

function ShoppingList({ phase, currentWeek, onDownloadPDF, onPrint, isGenerating, className = "" }: { phase: Phase, currentWeek: number, onDownloadPDF?: () => void, onPrint?: () => void, isGenerating?: boolean, className?: string }) {
  const cycleIndex = Math.floor((currentWeek - 1) / 2);
  const proteinCycles = [
    ['Ayam', 'Ikan'], // Cycle 0 (Weeks 1-2)
    ['Daging Sapi (Tanpa Lemak)', 'Tahu & Tempe'], // Cycle 1 (Weeks 3-4)
    ['Udang / Cumi', 'Kacang Hijau / Edamame'], // Cycle 2 (Weeks 5-6)
    ['Dada Bebek (Tanpa Kulit)', 'Jamur & Tahu Sutra'], // Cycle 3 (Weeks 7-8)
    ['Ayam Kampung', 'Kacang Merah / Tempe Mendoan (Panggang)'], // Cycle 4 (Weeks 9-10)
  ];
  const currentProteinPair = proteinCycles[cycleIndex % proteinCycles.length];
  
  const shoppingItems = [
    { category: 'Protein Hewani/Nabati', items: [
      { name: currentProteinPair[0], qty: '1.2 kg', desc: 'Untuk 7 porsi makan (Lauk Utama)' },
      { name: currentProteinPair[1], qty: '1.2 kg', desc: 'Untuk 7 porsi makan (Lauk Pendamping)' },
      { name: 'Telur Ayam', qty: '14 Butir', desc: '2 butir/hari untuk sarapan' }
    ]},
    { category: 'Karbohidrat Utama', items: [
      { name: 'Beras Putih/Merah', qty: '1 kg', desc: 'Porsi 50-100g per makan' },
      { name: 'Jagung/Ubi/Kentang', qty: '7 Unit', desc: 'Untuk Snack Malam (Sesuai Jadwal)' }
    ]},
    { category: 'Sayuran (Porsi 100g)', items: [
      { name: 'Selada Keriting / Romaine', qty: '500 g', desc: 'Variasi Lalap/Tumis' },
      { name: 'Selada Air / Siomak', qty: '500 g', desc: 'Variasi Kuah/Tumis' },
      { name: 'Tomat & Timun', qty: '400 g', desc: 'Pelengkap Lalapan Segar' }
    ]},
    { category: 'Buah-buahan (Porsi 150-250g)', items: [
      { name: 'Pepaya / Semangka / Melon', qty: '2 kg', desc: 'Untuk Snack Pagi' },
      { name: 'Apel / Pisang / Pir', qty: '7 Buah', desc: 'Untuk Snack Siang' }
    ]},
    { category: 'Bumbu & Pelengkap', items: [
      { name: 'Bumbu Dasar', qty: 'Secukupnya', desc: 'Garam, Lada, Bawang, Jahe, Kunyit' },
      { name: 'Jeruk Nipis', qty: '3-5 Buah', desc: 'Untuk marinasi protein' },
      { name: 'Minyak Zaitun / Kelapa', qty: '100 ml', desc: 'Untuk menumis sehat' }
    ]}
  ];

  return (
    <div id="shopping-list-print" className={`card border-brand-accent/20 bg-brand-accent/5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShoppingBag size={18} className="text-brand-accent" />
          <h3 className="font-serif font-bold text-lg">Daftar Belanja Mingguan</h3>
        </div>
        <button 
          onClick={onDownloadPDF}
          disabled={isGenerating}
          className="p-2 rounded-full bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20 transition-colors print:hidden disabled:opacity-50"
          title="Download PDF"
        >
          {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
        </button>
      </div>
      
      <div className="space-y-6">
        {shoppingItems.map((group, idx) => (
          <div key={idx} className="space-y-2">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-accent opacity-80 border-b border-brand-accent/10 pb-1">
              {group.category}
            </h4>
            <div className="space-y-2">
              {group.items.map((item, iIdx) => (
                <div key={iIdx} className="flex justify-between items-start text-sm">
                  <div className="flex-1">
                    <span className="font-medium block">{item.name}</span>
                    <span className="text-[10px] text-brand-secondary opacity-70">{item.desc}</span>
                  </div>
                  <span className="font-bold text-brand-primary whitespace-nowrap ml-4">{item.qty}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 pt-4 border-t border-brand-accent/10">
        <p className="text-[9px] text-brand-secondary italic text-center">
          *Estimasi untuk 1 orang selama 7 hari. Sesuaikan dengan stok di rumah.
        </p>
      </div>
    </div>
  );
}

function MealPlan({ phase, activity, targetCalories, macros, dayOfProgram, exerciseCalories = 0, onDownloadPDF, onPrint, isGenerating, className = "" }: { phase: Phase, activity: ActivityLevel, targetCalories: number, macros?: { protein: number, fat: number, carbs: number }, dayOfProgram: number, exerciseCalories?: number, onDownloadPDF?: () => void, onPrint?: () => void, isGenerating?: boolean, className?: string }) {
  const currentWeek = Math.ceil(dayOfProgram / 7);
  const cycleIndex = Math.floor((currentWeek - 1) / 2);
  
  const proteinCycles = [
    ['Ayam', 'Ikan'], // Cycle 0 (Weeks 1-2)
    ['Daging Sapi (Tanpa Lemak)', 'Tahu & Tempe'], // Cycle 1 (Weeks 3-4)
    ['Udang / Cumi', 'Kacang Hijau / Edamame'], // Cycle 2 (Weeks 5-6)
    ['Dada Bebek (Tanpa Kulit)', 'Jamur & Tahu Sutra'], // Cycle 3 (Weeks 7-8)
    ['Ayam Kampung', 'Kacang Merah / Tempe Mendoan (Panggang)'], // Cycle 4 (Weeks 9-10)
  ];
  const currentProteinPair = proteinCycles[cycleIndex % proteinCycles.length];
  const isFirstProteinDay = (dayOfProgram + cycleIndex) % 2 !== 0;
  const mainProtein = isFirstProteinDay ? currentProteinPair[0] : currentProteinPair[1];
  
  const totalTarget = Math.round(targetCalories + exerciseCalories);
  
  // Nutritional values per 100g (FatSecret Indonesia)
  const nutritionData: Record<string, { p: number, f: number, c: number, kcal: number }> = {
    'Ayam': { p: 31, f: 3.6, c: 0, kcal: 165 },
    'Ikan': { p: 26, f: 3, c: 0, kcal: 128 },
    'Daging Sapi (Tanpa Lemak)': { p: 26, f: 15, c: 0, kcal: 250 },
    'Tahu & Tempe': { p: 13, f: 8, c: 5, kcal: 140 },
    'Udang / Cumi': { p: 20, f: 1.5, c: 0, kcal: 95 },
    'Kacang Hijau / Edamame': { p: 11, f: 5, c: 10, kcal: 120 },
    'Dada Bebek (Tanpa Kulit)': { p: 24, f: 10, c: 0, kcal: 190 },
    'Jamur & Tahu Sutra': { p: 5, f: 3, c: 2, kcal: 50 },
    'Ayam Kampung': { p: 25, f: 10, c: 0, kcal: 190 },
    'Kacang Merah / Tempe Mendoan (Panggang)': { p: 15, f: 8, c: 15, kcal: 180 },
    'Nasi': { p: 2.7, f: 0.3, c: 27.9, kcal: 129 },
    'Telur': { p: 12.6, f: 10.6, c: 1.2, kcal: 155 },
    'Snack1': { p: 0.5, f: 0.3, c: 11, kcal: 43 },
    'Snack2': { p: 0.3, f: 0.2, c: 14, kcal: 52 },
    'Snack3': { p: 3.4, f: 1.5, c: 21, kcal: 96 },
    'Sayur': { p: 1.5, f: 0.2, c: 3, kcal: 20 },
  };

  // Adjust macros if exercise calories are present (proportional increase)
  const adjustedMacros = macros ? {
    protein: Math.round(macros.protein * (totalTarget / targetCalories)),
    fat: Math.round(macros.fat * (totalTarget / targetCalories)),
    carbs: Math.round(macros.carbs * (totalTarget / targetCalories)),
  } : null;

  // Portion Calculation Logic
  const proteinStats = nutritionData[mainProtein] || nutritionData['Ayam'];
  const nasiStats = nutritionData['Nasi'];
  
  // Variasi metode masak: Panggang, Kukus, Pepes, Rebus, Sup Kuah Bening
  const cookingMethods = ['Panggang', 'Kukus', 'Pepes', 'Rebus', 'Sup Kuah Bening'];
  const methodIndex = (dayOfProgram - 1 + cycleIndex) % cookingMethods.length;
  const currentMethod = cookingMethods[methodIndex];

  // Variasi sayuran (Keluarga Lettuce / Selada di Indonesia)
  const vegetables = [
    'Selada Keriting (Lalap Mentah)', 
    'Selada Romaine (Tumis Bawang Putih)', 
    'Selada Air (Kuah Bening)', 
    'Selada Bokor / Iceberg (Rebus Sebentar)', 
    'Siomak / Selada Wangi (Tumis)', 
    'Selada Merah (Salad Segar)', 
    'Selada Romaine (Panggang)'
  ];
  const currentVeggie = vegetables[(dayOfProgram - 1 + cycleIndex) % vegetables.length];

  // Variasi Snack berdasarkan cycle
  const snack1Options = ['Pepaya / Semangka / Melon', 'Pir / Jeruk / Belimbing', 'Nanas / Naga / Jambu'];
  const snack2Options = ['1 Apel', '1 Pisang', '1 Pir'];
  const snack3Options = ['1 Jagung Rebus', '1 Ubi Rebus', '1 Kentang Rebus'];
  
  const currentSnack1 = snack1Options[cycleIndex % snack1Options.length];
  const currentSnack2 = snack2Options[cycleIndex % snack2Options.length];
  const currentSnack3 = snack3Options[cycleIndex % snack3Options.length];

  // Pergeseran waktu makan setiap 2 minggu (Cycle)
  const timeOffsets = [0, 30, -30, 60, -60];
  const offset = timeOffsets[cycleIndex % timeOffsets.length];
  
  const shiftTime = (baseTime: string, offsetMinutes: number) => {
    const [h, m] = baseTime.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m + offsetMinutes, 0);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // Dynamic Portion Calculation based on Macros
  const targetP = adjustedMacros?.protein || 60;
  const targetF = adjustedMacros?.fat || 30;
  const targetC = adjustedMacros?.carbs || 100;

  // 1. Essential Carbs (Veggies + Eggs)
  const essentialCarbs = (nutritionData['Telur'].c) + (nutritionData['Sayur'].c * 2);
  const remainingCarbs = Math.max(0, targetC - essentialCarbs);

  // 2. Allocate Carbs: 60% for Nasi (Lunch/Dinner), 40% for Snacks
  const carbsForNasi = remainingCarbs * 0.6;
  const carbsForSnacks = remainingCarbs * 0.4;

  // 3. Calculate Weights
  const totalNasiWeight = (carbsForNasi / nasiStats.c) * 100;
  const finalNasiWeight = Math.min(250, Math.max(50, Math.round(totalNasiWeight / 2))); // Min 50g per meal

  // 4. Calculate Snack Weights (Distribute carbsForSnacks across 3 snacks)
  const s1Weight = Math.min(250, Math.max(50, Math.round((carbsForSnacks * 0.4 / nutritionData['Snack1'].c) * 100)));
  const s2Weight = Math.min(150, Math.max(50, Math.round((carbsForSnacks * 0.3 / nutritionData['Snack2'].c) * 100)));
  const s3Weight = Math.min(150, Math.max(50, Math.round((carbsForSnacks * 0.3 / nutritionData['Snack3'].c) * 100)));

  // 5. Calculate Protein Weight
  const essentialProtein = (nutritionData['Telur'].p) + (nutritionData['Sayur'].p * 2);
  const remainingProtein = Math.max(0, targetP - essentialProtein);
  const finalProteinWeight = Math.min(250, Math.max(100, Math.round((remainingProtein / 2 / proteinStats.p) * 100)));

  const nasiWeightStr = `${finalNasiWeight}g`;
  const proteinWeightStr = `${finalProteinWeight}g`;
  const veggieWeightStr = '100g';
  const s1WeightStr = `${s1Weight}g`;
  const s2WeightStr = `${s2Weight}g`;
  const s3WeightStr = `${s3Weight}g`;

  const isCheatMeal = dayOfProgram % 7 === 0;

  const meals = [
    { time: shiftTime('06:30', offset), name: 'Sarapan', menu: '2 Telur Rebus', weight: '100g' },
    { time: shiftTime('08:00', offset), name: 'Snack 1', menu: currentSnack1, weight: s1WeightStr },
    { 
      time: shiftTime('11:00', offset), 
      name: 'Makan Siang', 
      menu: `Nasi + ${mainProtein} (${currentMethod}) + ${currentVeggie}`, 
      details: [
        { item: 'Nasi', w: nasiWeightStr },
        { item: mainProtein, w: proteinWeightStr },
        { item: currentVeggie, w: veggieWeightStr }
      ]
    },
    { time: shiftTime('14:00', offset), name: 'Snack 2', menu: currentSnack2, weight: s2WeightStr },
    { 
      time: shiftTime('17:00', offset), 
      name: 'Makan Malam', 
      menu: isCheatMeal ? 'Makan Bebas (Cheat Meal) - Max 600 kcal' : `Nasi + ${mainProtein} (${currentMethod}) + ${currentVeggie}`, 
      details: isCheatMeal ? [
        { item: 'Porsi', w: 'Wajar' },
        { item: 'Minuman', w: 'Rendah Gula' }
      ] : [
        { item: 'Nasi', w: nasiWeightStr },
        { item: mainProtein, w: proteinWeightStr },
        { item: currentVeggie, w: veggieWeightStr }
      ]
    },
    { time: shiftTime('20:00', offset), name: 'Snack 3', menu: currentSnack3, weight: s3WeightStr },
  ];

  const getRecipeSteps = (method: string, protein: string, veggie: string) => {
    switch (method) {
      case 'Panggang':
        return [
          `Marinasi ${protein} dengan garam, lada, dan perasan jeruk nipis.`,
          `Panaskan teflon anti lengket, panggang hingga matang merata di kedua sisi.`,
          `Siapkan sayur pendamping: ${veggie}.`,
          `Sajikan dengan nasi hangat.`
        ];
      case 'Kukus':
        return [
          `Bumbui ${protein} dengan irisan bawang putih, jahe, dan sedikit garam.`,
          `Kukus selama 15-20 menit hingga daging empuk dan matang.`,
          `Siapkan sayur pendamping: ${veggie}.`,
          `Sajikan hangat dengan nasi.`
        ];
      case 'Pepes':
        return [
          `Haluskan bumbu (kunyit, kemiri, bawang), campur dengan ${protein}.`,
          `Bungkus dengan daun pisang (opsional) atau wadah tahan panas.`,
          `Kukus atau panggang sebentar hingga aroma bumbu meresap.`,
          `Sajikan dengan nasi dan sayur pendamping: ${veggie}.`
        ];
      case 'Rebus':
        return [
          `Didihkan air dengan jahe, serai, dan daun salam.`,
          `Masukkan ${protein}, rebus hingga matang dan kaldu bening keluar.`,
          `Bumbui dengan sedikit garam dan lada.`,
          `Sajikan dengan nasi dan sayur pendamping: ${veggie}.`
        ];
      case 'Sup Kuah Bening':
        return [
          `Didihkan air, masukkan irisan bawang putih, bawang merah, dan seledri.`,
          `Masukkan potongan ${protein}, rebus hingga matang.`,
          `Bumbui dengan garam, lada, dan sedikit kaldu jamur.`,
          `Sajikan hangat dengan sayur pendamping: ${veggie}.`
        ];
      default:
        return [];
    }
  };

  const getMealMacros = (mealName: string, weightStr: string, details?: { item: string, w: string }[]) => {
    if (details) {
      let p = 0, f = 0, c = 0, kcal = 0;
      details.forEach(d => {
        const w = parseInt(d.w) || 0;
        const stats = nutritionData[d.item] || (d.item === 'Nasi' ? nutritionData['Nasi'] : nutritionData['Sayur']);
        p += (stats.p * w) / 100;
        f += (stats.f * w) / 100;
        c += (stats.c * w) / 100;
        kcal += (stats.kcal * w) / 100;
      });
      return { p: Math.round(p), f: Math.round(f), c: Math.round(c), kcal: Math.round(kcal) };
    } else {
      const w = parseInt(weightStr) || 0;
      let stats = nutritionData['Snack1'];
      if (mealName === 'Sarapan') stats = nutritionData['Telur'];
      if (mealName === 'Snack 2') stats = nutritionData['Snack2'];
      if (mealName === 'Snack 3') stats = nutritionData['Snack3'];
      
      return {
        p: Math.round((stats.p * w) / 100),
        f: Math.round((stats.f * w) / 100),
        c: Math.round((stats.c * w) / 100),
        kcal: Math.round((stats.kcal * w) / 100),
      };
    }
  };

  return (
    <div id={`meal-plan-day-${dayOfProgram}`} className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Utensils size={18} className="text-brand-accent print:hidden" />
          <h3 className="text-xl font-serif font-bold">Menu 6x Makan</h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <div className="text-[10px] font-bold uppercase bg-brand-primary/5 px-2 py-1 rounded">
              Target: {Math.round(targetCalories)} kcal
            </div>
            {exerciseCalories > 0 && (
              <div className="text-[9px] font-bold text-brand-accent mt-1">
                + Olahraga: {exerciseCalories} kcal
              </div>
            )}
            <div className="text-[11px] font-bold text-brand-primary mt-1 border-t border-brand-primary/10 pt-1">
              Total: {totalTarget} kcal
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={onPrint}
              className="p-2 rounded-full bg-brand-primary/5 text-brand-primary hover:bg-brand-primary/10 transition-colors print:hidden"
              title="Print Resep"
            >
              <Printer size={18} />
            </button>
            <button 
              onClick={onDownloadPDF}
              disabled={isGenerating}
              className="p-2 rounded-full bg-brand-accent/5 text-brand-accent hover:bg-brand-accent/10 transition-colors print:hidden disabled:opacity-50"
              title="Download PDF"
            >
              {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            </button>
          </div>
        </div>
      </div>

      {adjustedMacros && (
        <div className="grid grid-cols-3 gap-2 print:hidden">
          <div className="bg-brand-primary/5 p-2 rounded-xl text-center border border-brand-primary/10">
            <span className="text-[8px] block opacity-60 uppercase font-bold">Protein</span>
            <span className="font-bold text-[10px]">{adjustedMacros.protein}g</span>
          </div>
          <div className="bg-brand-accent/5 p-2 rounded-xl text-center border border-brand-accent/10">
            <span className="text-[8px] block opacity-60 uppercase font-bold">Lemak</span>
            <span className="font-bold text-[10px]">{adjustedMacros.fat}g</span>
          </div>
          <div className="bg-blue-50 p-2 rounded-xl text-center border border-blue-100">
            <span className="text-[8px] block opacity-60 uppercase font-bold">Karbo</span>
            <span className="font-bold text-[10px] text-blue-600">{adjustedMacros.carbs}g</span>
          </div>
        </div>
      )}
      
      <div className="space-y-4">
        {meals.map((meal, i) => (
          <div key={i} className="flex gap-4 items-start">
            <div className="w-12 text-[10px] font-bold text-brand-secondary pt-1">
              {meal.time}
            </div>
            <div className="flex-1 card p-4 flex justify-between items-center">
              <div className="flex-1">
                <span className="block text-[10px] font-bold uppercase opacity-50 mb-0.5">{meal.name}</span>
                <span className="font-medium text-sm block mb-1">{meal.menu}</span>
                
                {(() => {
                  const m = getMealMacros(meal.name, 'weight' in meal ? meal.weight : '0g', 'details' in meal ? meal.details : undefined);
                  return (
                    <div className="flex gap-2 text-[8px] font-bold opacity-60 mt-1">
                      <span className="text-brand-primary">P: {m.p}g</span>
                      <span className="text-brand-accent">F: {m.f}g</span>
                      <span className="text-blue-600">C: {m.c}g</span>
                      <span className="text-gray-500">{m.kcal} kcal</span>
                    </div>
                  );
                })()}

                {'details' in meal && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {meal.details?.map((d, idx) => (
                      <div key={idx} className="text-[9px] bg-brand-bg px-2 py-0.5 rounded border border-brand-primary/5">
                        <span className="opacity-60">{d.item}:</span> <span className="font-bold">{d.w}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {'weight' in meal && (
                <div className="text-[10px] font-mono bg-brand-bg px-2 py-1 rounded">
                  {meal.weight}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-serif font-bold">Resep Menu Utama</h3>
        <div className="card space-y-4">
          <div>
            <h4 className="font-bold text-sm flex items-center gap-2 mb-2">
              <Utensils size={14} className="text-brand-accent" />
              {mainProtein} {currentMethod} Santuy
            </h4>
            <div className="text-xs space-y-2 text-brand-secondary">
              <p className="font-bold text-brand-primary">Bahan-bahan:</p>
              <ul className="list-disc list-inside">
                <li>{proteinWeightStr} {mainProtein} <span className="opacity-70">(Bagian bebas, timbang tanpa tulang)</span></li>
                <li>{nasiWeightStr} Nasi Putih</li>
                <li>{veggieWeightStr} {currentVeggie}</li>
                <li>Bumbu sesuai metode {currentMethod}</li>
              </ul>
              <p className="font-bold text-brand-primary mt-2">Cara Memasak:</p>
              <ol className="list-decimal list-inside">
                {getRecipeSteps(currentMethod, mainProtein, currentVeggie).map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HealthDisclaimer({ dayOfProgram }: { dayOfProgram: number }) {
  // Only show at the start of each week (Day 1, 8, 15, etc.)
  if ((dayOfProgram - 1) % 7 !== 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card border-4 border-red-600 bg-red-50 space-y-4 shadow-xl"
    >
      <div className="flex items-center gap-3 text-red-600">
        <AlertTriangle size={28} className="shrink-0" />
        <h4 className="font-bold uppercase text-lg tracking-tight">Peringatan Kesehatan Penting</h4>
      </div>
      
      <div className="space-y-4 text-sm leading-relaxed">
        <div className="bg-white p-4 rounded-2xl border border-red-200 shadow-sm">
          <p className="font-black text-red-700 mb-2">⚠️ PERINGATAN KESEHATAN UMUM:</p>
          <p className="text-gray-800 font-medium">
            Program ini adalah panduan nutrisi umum berbasis perhitungan matematika (Mifflin-St Jeor). Hasil dapat bervariasi. 
            Jika Anda merasa pusing, lemas berlebih, atau sesak napas, <span className="font-black underline">segera hentikan program</span>.
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-red-200 shadow-sm">
          <p className="font-black text-red-700 mb-2">⚠️ PERINGATAN KHUSUS (KONDISI MEDIS):</p>
          <p className="text-gray-800 font-medium">
            Jika Anda memiliki riwayat <span className="font-black">Gangguan Ginjal, Jantung, atau Hipertensi</span>, harap <span className="font-black underline">TIDAK mengikuti</span> saran asupan air putih tinggi 
            atau diet tinggi protein ini secara mentah-mentah. Konsultasikan dengan dokter spesialis Anda mengenai batas aman asupan cairan dan protein harian Anda.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function ChatView({ profile }: { profile: UserProfile | null }) {
  const getPanggilan = (p: UserProfile | null) => {
    if (!p) return 'Sobat Santuy';
    const isMale = p.gender === 'M';
    const isOlder = p.age > 30;
    
    if (isMale) {
      return isOlder ? `Pak ${p.name}` : `Mas ${p.name}`;
    } else {
      return isOlder ? `Bu ${p.name}` : `Mbak ${p.name}`;
    }
  };

  const panggilan = getPanggilan(profile);

  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([
    { role: 'model', text: `Halo ${panggilan}! Saya Santuy Diet Coach. Ada yang bisa saya bantu terkait program diet sehat Anda hari ini?` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = "gemini-3-flash-preview";
      
      const systemInstruction = `
        Anda adalah "Santuy Diet Coach", konsultan diet sehat yang ramah, santai, namun tetap profesional.
        Tujuan Anda adalah membantu pengguna memahami program diet mereka, memberikan saran nutrisi, dan memotivasi mereka.
        
        Konteks Pengguna:
        - Nama: ${profile?.name}
        - Umur: ${profile?.age}
        - Berat Awal: ${profile?.initialWeight}kg
        - Tinggi: ${profile?.height}cm
        - Gender: ${profile?.gender === 'M' ? 'Pria' : 'Wanita'}
        - Preferensi Makro: ${profile?.macroPreference} Carb
        - Panggilan Akrab: ${panggilan}
        
        Aturan:
        1. Selalu sapa pengguna dengan panggilan "${panggilan}" untuk menciptakan kedekatan budaya Indonesia yang sopan.
        2. Selalu berikan saran yang aman. Jika pengguna bertanya tentang kondisi medis serius, ingatkan mereka untuk konsultasi ke dokter.
        3. Gunakan bahasa Indonesia yang santai tapi sopan (Gaya "Santuy").
        4. Berikan jawaban yang ringkas dan mudah dipahami.
        5. Jika ditanya tentang porsi, ingatkan bahwa aplikasi sudah menghitungkan porsi ideal di tab Diet.
        6. Tekankan pentingnya kombinasi defisit kalori dan olahraga. Jelaskan bahwa olahraga membantu membakar lemak lebih cepat dan menjaga metabolisme tetap tinggi.
      `;

      const chat = ai.chats.create({
        model,
        config: { systemInstruction }
      });

      // We need to send the history
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const response = await ai.models.generateContent({
        model,
        contents: [
          ...history.map(h => ({ role: h.role === 'model' ? 'model' : 'user', parts: h.parts })),
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        config: { systemInstruction }
      });

      const text = response.text || "Maaf, saya sedang tidak bisa berpikir jernih. Bisa ulangi?";
      setMessages(prev => [...prev, { role: 'model', text }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Waduh, koneksi saya lagi santuy banget nih (error). Coba lagi ya!" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-[calc(100vh-180px)]"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-brand-primary flex items-center justify-center text-white">
          <MessageSquare size={20} />
        </div>
        <div>
          <h3 className="font-serif font-bold text-lg">Konsultasi Santuy</h3>
          <p className="text-[10px] text-brand-secondary uppercase font-bold opacity-60">AI Diet Coach Active</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide mb-4">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
              m.role === 'user' 
                ? 'bg-brand-primary text-white rounded-tr-none' 
                : 'bg-white border border-brand-primary/10 text-brand-primary rounded-tl-none'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-brand-primary/10 p-3 rounded-2xl rounded-tl-none">
              <Loader2 size={16} className="animate-spin text-brand-accent" />
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input 
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Tanya tentang dietmu..."
          className="flex-1 bg-white border border-brand-primary/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
        />
        <button 
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="w-12 h-12 bg-brand-primary text-white rounded-xl flex items-center justify-center disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
        >
          <Send size={20} />
        </button>
      </div>
    </motion.div>
  );
}

function BottomNav({ currentView, setView, className = "" }: { currentView: string, setView: (v: 'diet' | 'progress' | 'profile' | 'chat') => void, className?: string }) {
  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-white border-t border-brand-primary/5 px-4 py-4 flex justify-around items-center z-50 ${className}`}>
      <button 
        onClick={() => setView('diet')}
        className={`flex flex-col items-center gap-1 ${currentView === 'diet' ? 'text-brand-primary' : 'text-brand-secondary'}`}
      >
        <Calendar size={20} />
        <span className="text-[10px] font-bold uppercase">Diet</span>
      </button>
      <button 
        onClick={() => setView('progress')}
        className={`flex flex-col items-center gap-1 ${currentView === 'progress' ? 'text-brand-primary' : 'text-brand-secondary'}`}
      >
        <Weight size={20} />
        <span className="text-[10px] font-bold uppercase">Progres</span>
      </button>
      <button 
        onClick={() => setView('chat')}
        className={`flex flex-col items-center gap-1 ${currentView === 'chat' ? 'text-brand-primary' : 'text-brand-secondary'}`}
      >
        <MessageSquare size={20} />
        <span className="text-[10px] font-bold uppercase">Chat</span>
      </button>
      <button 
        onClick={() => setView('profile')}
        className={`flex flex-col items-center gap-1 ${currentView === 'profile' ? 'text-brand-primary' : 'text-brand-secondary'}`}
      >
        <User size={20} />
        <span className="text-[10px] font-bold uppercase">Profil</span>
      </button>
    </div>
  );
}
