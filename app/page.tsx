"use client";
import { useUploadThing } from "@/src/utils/uploadthing";
import { useRouter } from "next/navigation";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import Image from 'next/image';
import { 
  createGoogleCalendarUrl, 
  downloadICSFile, 
  createOutlookCalendarUrl, 
  detectDevice 
} from '../src/utils/calendar-utils';

export default function Home() {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [convertedBlob, setConvertedBlob] = useState<Blob | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showLocationSection, setShowLocationSection] = useState(false);
  const [fileUrls, setFileUrls] = useState<Map<File, string>>(new Map());
  const [showCalendarOptions, setShowCalendarOptions] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  
  // Notification sistemi için state'ler
  const [notifications, setNotifications] = useState<{
    id: number;
    message: string;
    type: 'success' | 'error';
    show: boolean;
  }[]>([]);
  
  // Notification ID counter
  const notificationIdRef = useRef(0);
  const [participants, setParticipants] = useState<string[]>([]);
  const [isAddingParticipant, setIsAddingParticipant] = useState(false);
  const [activeTab, setActiveTab] = useState('text'); // 'text' veya 'voice'
  // wedding music
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [showMusicButton, setShowMusicButton] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null)
  
  // Wedding date - useMemo ile stable hale getir
  const weddingDate = useMemo(() => new Date('2025-08-30T16:00:00'), []);
  

  // Ses kaydı için isim state'i eklendi
  const [userName, setUserName] = useState("");
  const [userStoppedMusic, setUserStoppedMusic] = useState(false);

  // Dosya seçimi için state'ler
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Not yazma için state'ler
  const [noteText, setNoteText] = useState("");
  const [noteAuthor, setNoteAuthor] = useState("");
  const [isUploadingNote, setIsUploadingNote] = useState(false);

  // Müzik kontrolü
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
  
    const handleCanPlay = () => {
      console.log("🎵 Müzik dosyası hazır");
      audio.volume = 0.3;
      
      if (userInteracted && !userStoppedMusic) {
        audio.play()
          .then(() => {
            console.log("🎵 Müzik başlatıldı");
            setMusicPlaying(true);
            setShowMusicButton(false);
          })
          .catch(() => {
            setShowMusicButton(true);
          });
      } else {
        setShowMusicButton(true);
      }
    };
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('play', () => setMusicPlaying(true));
    audio.addEventListener('pause', () => setMusicPlaying(false));
  
    return () => {
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [userInteracted, userStoppedMusic]);
  
  // Notification gösterme fonksiyonu
  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    const id = ++notificationIdRef.current;
    const newNotification = { id, message, type, show: true };
    
    setNotifications(prev => [...prev, newNotification]);
    
    // 5 saniye sonra notification'ı gizle
    setTimeout(() => {
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === id ? { ...notif, show: false } : notif
        )
      );
      
      // 500ms sonra tamamen kaldır (animasyon için)
      setTimeout(() => {
        setNotifications(prev => prev.filter(notif => notif.id !== id));
      }, 500);
    }, 5000);
  };
  
  // Tarih formatını ICS formatına çevir
  const formatDateForICS = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  // Takvim ekleme fonksiyonları
  const addToGoogleCalendar = () => {
    const title = "Emre & Zeynep Düğünü";
    const startDate = new Date('2025-08-30T16:00:00');
    const endDate = new Date('2025-08-30T18:00:00'); 
    const location = "La Jovia - Wedding & Convention, Yıldızevler, Turan Güneş Blv. No: 2, 06550 Çankaya/Ankara";
    const description = `Sevgili ${userName || 'Dostumuz'},
  
  Emre & Zeynep'ın düğün törenine davetlisiniz!
  
  📅 Tarih: 30 Ağustos 2025
  🕐 Saat: 16:00
  📍 Mekan: ${location}
  
  Bu özel günümüzde yanımızda olmanızdan mutluluk duyacağız.
  
  Hatırlatma: Etkinlikten önce bildirim alacaksınız.
  
  Sevgiler,
  Emre & Zeynep`;
  
    const url = createGoogleCalendarUrl(title, startDate, endDate, location, description);
    window.open(url, '_blank');
    showNotification("Google Takvim açıldı! Etkinliği kaydetmeyi unutmayın.", "success");
  };
  
  const addToAppleCalendar = () => {
    const title = "Emre & Zeynep Düğünü";
    const startDate = new Date('2025-08-30T16:00:00');
    const endDate = new Date('2025-08-30T18:00:00');
    const location = "La Jovia - Wedding & Convention, Yıldızevler, Turan Güneş Blv. No: 2, 06550 Çankaya/Ankara";
    const description = `Sevgili ${userName || 'Dostumuz'},
  
  Emre & Zeynep'ın düğün törenine davetlisiniz!
  
  📅 Tarih: 30 Ağustos 2025
  🕐 Saat: 16:00
  📍 Mekan: ${location}
  
  Bu özel günümüzde yanımızda olmanızdan mutluluk duyacağız.
  
  Hatırlatma: Etkinlikten 1 gün önce saat 10:00'da ve 2 saat önce bildirim alacaksınız.
  
  Sevgiler,
  Emre & Zeynep`;
  
    downloadICSFile(title, startDate, endDate, location, description);
    showNotification("Takvim dosyası indirildi! Dosyayı açarak takviminize ekleyebilirsiniz.", "success");
  };
  
  const addToOutlookCalendar = () => {
    const title = "Emre & Zeynep Düğünü";
    const startDate = new Date('2025-08-30T16:00:00');
    const endDate = new Date('2025-08-30T18:00:00');
    const location = "La Jovia - Wedding & Convention, Yıldızevler, Turan Güneş Blv. No: 2, 06550 Çankaya/Ankara";
    const description = `Sevgili ${userName || 'Dostumuz'},
  
  Emre & Zeynep'ın düğün törenine davetlisiniz!
  
  📅 Tarih: 30 Ağustos 2025
  🕐 Saat: 16:00
  📍 Mekan: ${location}
  
  Bu özel günümüzde yanımızda olmanızdan mutluluk duyacağız.
  
  Hatırlatma: Etkinlikten 1 gün önce ve 2 saat önce bildirim alacaksınız.
  
  Sevgiler,
  Emre & Zeynep`;
  
    const url = createOutlookCalendarUrl(title, startDate, endDate, location, description);
    window.open(url, '_blank');
    showNotification("Outlook Takvim açıldı! Etkinliği kaydetmeyi unutmayın.", "success");
  };
  
  const handleAddToCalendar = () => {
    const device = detectDevice();
    
    if (device === 'ios') {
      addToAppleCalendar();
    } else if (device === 'android') {
      addToGoogleCalendar();
    } else {
      // Desktop için seçenekler göster
      setShowCalendarOptions(true);
    }
  };

  // Notification kapatma fonksiyonu
  const dismissNotification = (id: number) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, show: false } : notif
      )
    );
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(notif => notif.id !== id));
    }, 500);
  };

  // Kullanıcı etkileşimi takibi
  useEffect(() => {
    const handleFirstInteraction = () => {
      setUserInteracted(true);
      
      const audio = audioRef.current;
      if (audio && !musicPlaying && !userStoppedMusic) {
        audio.play()
          .then(() => {
            console.log("🎵 İlk etkileşim sonrası müzik başlatıldı");
            setMusicPlaying(true);
            setShowMusicButton(false);
          })
          .catch(() => {
            setShowMusicButton(true);
          });
      }
    };
  
    const events = ['click', 'touchstart', 'keydown'];
    events.forEach(event => {
      document.addEventListener(event, handleFirstInteraction, { once: true });
    });
  
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleFirstInteraction);
      });
    };
  }, [musicPlaying, userStoppedMusic]);

  // Component unmount cleanup
  useEffect(() => {
    return () => {
      // Cleanup all refs and timers
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);
  
  useEffect(() => {
    const loadExistingParticipants = async () => {
      try {
        const response = await fetch('/api/get-participants');
        if (response.ok) {
          const data = await response.json();
          setParticipants(data.participants || []);
        }
      } catch (error) {
        console.log('Mevcut katılımcılar yüklenemedi:', error);
      }
    };
  loadExistingParticipants();
  }, []);

  // Otomatik müzik başlatma
  useEffect(() => {
    const startMusic = () => {
      if (audioRef.current) {
        audioRef.current.volume = 0.3;
        audioRef.current.play().catch(console.error);
      }
    };
  
    // Sayfa yüklendiğinde müziği başlat
    startMusic();
    
    // Kullanıcı etkileşimi sonrası da dene (tarayıcı politikası için)
    const handleInteraction = () => {
      startMusic();
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
    
    document.addEventListener('click', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);
    
    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  // Geliştirilmiş addParticipant fonksiyonu
  const addParticipant = async (name: string) => {
    if (!isValidName(name)) {
      return false;
    }
    
    try {
      setIsAddingParticipant(true);
      
      // 1. Mevcut katılımcı listesini indir
      let existingParticipants: string[] = [];
      let existingFileKey: string | null = null;
      
      try {
        console.log('📋 Mevcut katılımcı listesi getiriliyor...');
        // Cache'i bypass etmek için timestamp ekle
        const cacheBuster = new Date().getTime();
        const response = await fetch(`/api/get-participants?t=${cacheBuster}`, {
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          existingParticipants = data.participants || [];
          existingFileKey = data.fileKey;
          console.log('📋 Mevcut katılımcılar:', existingParticipants.length, 'FileKey:', existingFileKey);
        }
      } catch (error) {
        console.log("📋 Mevcut liste bulunamadı, yeni liste oluşturuluyor...");
      }
      
      // 2. Aynı isim zaten var mı kontrol et
      const trimmedName = name.trim();
      if (existingParticipants.includes(trimmedName)) {
        showNotification("Bu isim zaten katılımcı listesinde mevcut!", "error");
        return false;
      }
      
      // 3. Yeni katılımcıyı ekle
      const updatedParticipants = [...existingParticipants, trimmedName];
      console.log('📋 Güncellenmiş katılımcı listesi:', updatedParticipants.length, 'katılımcı');
      
      // 4. Yeni JSON dosyasını oluştur
      const participantData = {
        participants: updatedParticipants,
        lastUpdated: new Date().toISOString(),
        totalCount: updatedParticipants.length
      };
      
      const jsonContent = JSON.stringify(participantData, null, 2);
      const jsonFile = new File([jsonContent], "katilimci-listesi.json", {
        type: "application/json",
      });
      
      // 5. State'i güncelle (UI'da göstermek için)
      setParticipants(updatedParticipants);
      
      // 6. Yeni dosyayı yükle ve sonucunu bekle
      console.log('📤 Yeni katılımcı dosyası yükleniyor...');
      
      try {
        await startParticipantUpload([jsonFile]);
        
        // Upload başarılı olduktan sonra eski dosyayı sil
        if (existingFileKey) {
          setTimeout(async () => {
            try {
              console.log('🗑️ Eski dosya siliniyor:', existingFileKey);
              
              const deleteResponse = await fetch('/api/delete-file', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ fileKey: existingFileKey }),
              });
              
              const deleteResult = await deleteResponse.json();
              if (deleteResponse.ok && deleteResult.success) {
                console.log('🗑️ Eski dosya başarıyla silindi');
              } else {
                console.warn('🗑️ Eski dosya silinemedi:', deleteResult);
              }
            } catch (error) {
              console.warn("🗑️ Eski dosya silme hatası:", error);
            }
          }, 3000); // 3 saniye bekle
        }
        
        console.log('✅ Katılımcı başarıyla eklendi:', trimmedName);
        return true;
        
      } catch (error) {
        console.error("❌ Katılımcı yükleme hatası:", error);
        showNotification("Katılımcı eklenirken hata oluştu!", "error");
        setParticipants(prev => prev.filter(p => p !== trimmedName));
        return false;
      }
      
    } catch (error) {
      console.error("❌ Katılımcı ekleme hatası:", error);
	  showNotification("Katılımcı eklenirken hata oluştu!", "error");
      setParticipants(prev => prev.filter(p => p !== name.trim()));
      return false;
    } finally {
      setIsAddingParticipant(false);
    }
  };
  
  // Müzik fonksiyonları
  const startMusic = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.play()
        .then(() => {
          setMusicPlaying(true);
          setShowMusicButton(false);
          setUserInteracted(true);
          setUserStoppedMusic(false); // Müzik tekrar başlatıldığında bu flag'i sıfırla
        })
        .catch(console.error);
    }
  };
  
  const stopMusic = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      setMusicPlaying(false);
      setUserStoppedMusic(true); // Kullanıcının müziği durdurduğunu işaretle
    }
  };

  const weddingLocation = {
    name: "La Jovia - Wedding & Convention",
    address: "Yıldızevler, Turan Güneş Blv. No: 2, 06550 Çankaya/Ankara",
  };

  const uploadNote = async () => {
    if (!noteText.trim()) {
      showNotification("Lütfen bir mesaj yazın!", "error");
      return;
    }
    
    if (!isValidName(userName)) {
      showNotification("Lütfen adınızı ve soyadınızı tam olarak girin! (Örn: Ahmet Yılmaz)", "error");
      return;
    }
	
    try {
      // Dosya adını isim ve tarih ile oluştur
      const sanitizedName = userName.trim().replace(/[^a-zA-Z0-9çğıöşüÇĞIİÖŞÜ\s]/g, '').replace(/\s+/g, '_');
      const timestamp = new Date().toLocaleString('tr-TR').replace(/[/:]/g, '-').replace(/\s/g, '_');
      const fileName = `${sanitizedName}_f_Not${timestamp}.txt`;
      
      // Not içeriğini oluştur
      const noteContent = `Gönderen: ${userName}\nTarih: ${new Date().toLocaleString('tr-TR')}\n\nMesaj:\n${noteText}`;
      
      const noteFile = new File([noteContent], fileName, {
        type: "text/plain",
      });
  
      await startNoteUpload([noteFile]);
    } catch (error: any) {
      console.error("❌ Not yükleme hatası:", error);
      showNotification(`Not yükleme sırasında hata oluştu: ${error.message || "Bilinmeyen hata"}`, "error");
      setIsUploadingNote(false);
    }
  };
  
  
  // Geri Sayım Fonksiyonu - useCallback ile stable hale getir
  const calculateTimeLeft = useCallback(() => {
    const now = new Date().getTime();
    const wedding = weddingDate.getTime();
    const difference = wedding - now;

    if (difference > 0) {
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000)
      };
    }
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }, [weddingDate]);
  
  // Geri sayım timer - stable dependencies
  useEffect(() => {
    // İlk değeri hemen set et
    setTimeLeft(calculateTimeLeft());
    
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
  
    return () => clearInterval(timer);
  }, [calculateTimeLeft]); // Add calculateTimeLeft to dependencies
  
  
  // 3. Katılımcı yükleme için yeni hook
  const { startUpload: startParticipantUpload, isUploading: participantUploadThingUploading } = useUploadThing("imageUploader", {
    onClientUploadComplete: (res: any[]) => {
      console.log("✅ Katılımcı listesi güncellendi:", res);
      console.log("✅ Yeni dosya key:", res[0]?.key);
      // Başarı durumunda herhangi bir işlem yapmaya gerek yok
      // State zaten addParticipant fonksiyonunda güncellendi
    },
    onUploadError: (error: Error) => {
      console.error("❌ Katılımcı listesi yükleme hatası:", error);
      showNotification(`Katılımcı listesi yükleme hatası: ${error.message}`, "error");
      // Hata durumunda son eklenen katılımcıyı state'ten kaldır
      setParticipants(prev => {
        const newList = [...prev];
        newList.pop(); // Son eklenen katılımcıyı kaldır
        return newList;
      });
    },
    onUploadBegin: (name: string) => {
      console.log("📤 Katılımcı listesi yükleme başladı:", name);
    },
  });

  // Dosya yükleme için hook
  const { startUpload, isUploading: uploadThingUploading } = useUploadThing("imageUploader", {
    onClientUploadComplete: (res: any[]) => {
      console.log("✅ Dosya yükleme tamamlandı:", res);
      
      // URL'leri temizle
      fileUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      setFileUrls(new Map());
      
      setSelectedFiles([]);
      setIsUploadingFile(false);
      setUploadProgress(0);
      showNotification("Dosyalar başarıyla gönderildi!", "success"); 
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onUploadError: (error: Error) => {
      console.error("❌ Dosya yükleme hatası:", error);
      showNotification(`Yükleme hatası: ${error.message}`, "error");
      setIsUploadingFile(false);
      setUploadProgress(0);
    },
    onUploadBegin: (name: string) => {
      console.log("📤 Dosya yükleme başladı:", name);
      setIsUploadingFile(true);
    },
    onUploadProgress: (progress: number) => {
      setUploadProgress(progress);
    },
  });

  // Not yükleme için ayrı hook
  const { startUpload: startNoteUpload, isUploading: noteUploadThingUploading } = useUploadThing("imageUploader", {
    onClientUploadComplete: (res: any[]) => {
      console.log("✅ Not yükleme tamamlandı:", res);
      setNoteText("");
      setIsUploadingNote(false);
      showNotification("Mesajınız başarıyla gönderildi!", "success");
    },
    onUploadError: (error: Error) => {
      console.error("❌ Not yükleme hatası:", error);
      showNotification(`Yükleme hatası: ${error.message}`, "error");
      setIsUploadingNote(false);
    },
    onUploadBegin: (name: string) => {
      console.log("📤 Not yükleme başladı:", name);
      setIsUploadingNote(true);
    },
  });

  // Ses yükleme için ayrı hook
  const { startUpload: startAudioUpload, isUploading: audioUploadThingUploading } = useUploadThing("imageUploader", {
    onClientUploadComplete: (res: any[]) => {
      console.log("✅ Ses yükleme tamamlandı:", res);
      setAudioBlob(null);
      setConvertedBlob(null);
      setRecordingTime(0);
      setIsUploading(false);
      showNotification("Ses kaydı başarıyla gönderildi!", "success");  // Başarı mesajını göster
    },
    onUploadError: (error: Error) => {
      console.error("❌ Ses yükleme hatası:", error);
      showNotification(`Yükleme hatası: ${error.message}`, "error");
      setIsUploading(false);
    },
    onUploadBegin: (name: string) => {
      console.log("📤 Ses yükleme başladı:", name);
      setIsUploading(true);
    },
  });

  // Dosya seçimi fonksiyonları
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileArray = Array.from(files);
      setSelectedFiles(prev => [...prev, ...fileArray]);
      
      // Yeni dosyalar için URL'ler oluştur
      fileArray.forEach(file => {
        if (file.type.startsWith('image/')) {
          const url = URL.createObjectURL(file);
          setFileUrls(prev => new Map(prev).set(file, url));
        }
      });
    }
    
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  // 5. Alternatif: Manuel katılımcı ekleme butonu
  const handleAddParticipant = async () => {
    if (!isValidName(userName)) {
      showNotification("Lütfen geçerli bir isim girin!", "error");
      return;
    }
    
    const success = await addParticipant(userName.toLowerCase());
    if (success) {
      showNotification("Katılımcı listesine eklendi!", "success");
    }
  };
  
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    
    const files = event.dataTransfer.files;
    if (files) {
      const fileArray = Array.from(files);
      setSelectedFiles(prev => [...prev, ...fileArray]);
      
      // Yeni dosyalar için URL'ler oluştur
      fileArray.forEach(file => {
        if (file.type.startsWith('image/')) {
          const url = URL.createObjectURL(file);
          setFileUrls(prev => new Map(prev).set(file, url));
        }
      });
    }
  };

  const removeFile = (index: number) => {
    const fileToRemove = selectedFiles[index];
    
    // URL'i temizle
    const url = fileUrls.get(fileToRemove);
    if (url) {
      URL.revokeObjectURL(url);
      setFileUrls(prev => {
        const newMap = new Map(prev);
        newMap.delete(fileToRemove);
        return newMap;
      });
    }
    
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return;
    
    try {
      setIsUploadingFile(true);
      
      // Dosya adlarını formatla
      const renamedFiles = selectedFiles.map(file => {
        const sanitizedName = userName.trim().replace(/[^a-zA-Z0-9çğıöşüÇĞIİÖŞÜ\s]/g, '').replace(/\s+/g, '_');
        const fileExtension = file.name.split('.').pop();
        const originalFileName = file.name.replace(`.${fileExtension}`, '');
        const newFileName = `${sanitizedName}_f_${originalFileName}.${fileExtension}`;
        
        return new File([file], newFileName, {
          type: file.type,
          lastModified: file.lastModified,
        });
      });
      
      await startUpload(renamedFiles);
    } catch (error: any) {
      console.error("❌ Dosya yükleme hatası:", error);
      showNotification(`Dosya yükleme sırasında hata oluştu: ${error.message || "Bilinmeyen hata"}`, "error");
      setIsUploadingFile(false);
      setUploadProgress(0);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // İsim validasyonu - en az 3 karakter ve boşluk içermeli (ad soyad için)
  const isValidName = (name: string) => {
    const trimmedName = name.trim();
    return trimmedName.length >= 3 && trimmedName.includes(' ');
  };

  // Kayıt başlatma - buton her zaman aktif
  const handleStartRecording = () => {
    stopMusic();
    startRecording();
  };

  // Ses kayıt fonksiyonları
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const options: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options.mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/wav')) {
        options.mimeType = 'audio/wav';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options.mimeType = 'audio/mp4';
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorder.mimeType || 'audio/wav';
        const blob = new Blob(chunks, { type: mimeType });
        setAudioBlob(blob);
        
        await convertToWav(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
	  
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Mikrofon erişimi hatası:", error);
      showNotification("Mikrofon erişimi sağlanamadı. Lütfen tarayıcı ayarlarınızı kontrol edin.", "error");

    }
  };

  const stopRecording = () => {
    try {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
  
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
  
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      }
    } catch (error) {
      console.error("Recording stop error:", error);
      setIsRecording(false);
    }
  };

  const convertToWav = async (inputBlob: Blob) => {
    setIsConverting(true);
    let audioContext: AudioContext | null = null;
    
    try {
      audioContext = new AudioContext();
      const arrayBuffer = await inputBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
      const channelData = audioBuffer.getChannelData(0);
      const samples = new Int16Array(channelData.length);
  
      for (let i = 0; i < channelData.length; i++) {
        samples[i] = Math.max(-32768, Math.min(32767, channelData[i] * 32768));
      }
  
      const wavBlob = createWavBlob(samples, audioBuffer.sampleRate);
      setConvertedBlob(wavBlob);
    } catch (error) {
      console.error("Dönüştürme hatası:", error);
      setConvertedBlob(inputBlob);
    } finally {
      if (audioContext && audioContext.state !== 'closed') {
        await audioContext.close();
      }
      setIsConverting(false);
    }
  };

  const createWavBlob = (samples: Int16Array, sampleRate: number): Blob => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
      view.setInt16(offset, samples[i], true);
      offset += 2;
    }

    return new Blob([buffer], { type: "audio/wav" });
  };

  const uploadAudio = async () => {
    const blobToUpload = convertedBlob || audioBlob;
    if (!blobToUpload) {
      console.error("Yüklenecek ses dosyası bulunamadı");
      return;
    }

    // İsim kontrolü sadece yükleme sırasında yapılacak
    if (!isValidName(userName)) {
      showNotification("Lütfen adınızı ve soyadınızı tam olarak girin! (Örn: Ahmet Yılmaz)", "error");
      return;
    }
	
    try {
      // Dosya adını isim ve tarih ile oluştur
      const sanitizedName = userName.trim().replace(/[^a-zA-Z0-9çğıöşüÇĞIİÖŞÜ\s]/g, '').replace(/\s+/g, '_');
      const timestamp = new Date().toLocaleString('tr-TR').replace(/[/:]/g, '-').replace(/\s/g, '_');
      const fileName = `${sanitizedName}_f_Ses_Kaydı${timestamp}.wav`;
      
      const audioFile = new File([blobToUpload], fileName, {
        type: "audio/wav",
      });

      await startAudioUpload([audioFile]);
    } catch (error: any) {
      console.error("❌ Ses yükleme hatası:", error);
      showNotification(`Ses yükleme sırasında hata oluştu: ${error.message || "Bilinmeyen hata"}`, "error");
      setIsUploading(false);
    }
  };

  // Buraya ekle:
  const openInMaps = () => {
    const searchTerm = "La Jovia - Wedding & Convention Çankaya Ankara";
    const url = `https://www.google.com/maps/search/${encodeURIComponent(searchTerm)}`;
    window.open(url, '_blank');
  };

  const deleteRecording = () => {
    setAudioBlob(null);
    setConvertedBlob(null);
    setRecordingTime(0);
  };

  // Audio URL - sadece blob'lar değiştiğinde yeniden hesapla
  const audioUrl = useMemo(() => {
    if (convertedBlob) return URL.createObjectURL(convertedBlob);
    if (audioBlob) return URL.createObjectURL(audioBlob);
    return null;
  }, [convertedBlob, audioBlob]);


  // Component unmount'ta URL'leri temizle
  useEffect(() => {
    return () => {
      fileUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [fileUrls]);
  
  // Audio URL cleanup - sadece component unmount'ta çalışır
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]); // boş dependency array

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
      <main className="flex min-h-screen flex-col items-center px-4 py-8 sm:px-6 md:px-8 lg:px-24">
        {/* Otomatik Müzik */}
        <audio
          ref={audioRef}
          src="/wedding-music.mp3"
          loop
          preload="auto"
          className="hidden"
        />
        {/* Müzik başlat butonu */}
        {showMusicButton && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50">
            <button
              onClick={startMusic}
              className="bg-gradient-to-r from-pink-300 to-pink-500 hover:from-pink-200 hover:to-purple-300 text-white px-4 py-2 text-sm rounded-full shadow-lg flex items-center gap-2 animate-bounce"
            >
              🎵 Müziği Başlat
            </button>
          </div>
        )}
        
        {/* Müzik Kontrol Paneli */}
        {(musicPlaying || userStoppedMusic) && userInteracted && (
          <div className="fixed bottom-4 left-4 z-50 bg-white bg-opacity-90 backdrop-blur-sm border border-gray-200 px-4 py-2 rounded-full shadow-lg flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className={musicPlaying ? "text-green-500 animate-pulse" : "text-gray-500"}>🎵</span>
              <span className="text-sm font-medium text-gray-700">
                {musicPlaying ? "Müzik çalıyor" : "Müzik durdu"}
              </span>
            </div>
            {musicPlaying ? (
              <button
                onClick={stopMusic}
                className="text-gray-500 hover:text-red-500 transition-colors"
                title="Müziği durdur"
              >
                ⏸️
              </button>
            ) : (
              <button
                onClick={startMusic}
                className="text-gray-500 hover:text-green-500 transition-colors"
                title="Müziği başlat"
              >
                ▶️
              </button>
            )}
          </div>
        )}
        
        {/* Notification Container */}
        <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
          <div className="flex flex-col items-center pt-4 px-4 space-y-2">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`
                  max-w-md w-full pointer-events-auto transform transition-all duration-500 ease-in-out
                  ${notification.show 
                    ? 'translate-y-0 opacity-100 scale-100' 
                    : '-translate-y-full opacity-0 scale-95'
                  }
                  ${notification.type === 'success' 
                    ? 'bg-green-500 text-white' 
                    : 'bg-red-500 text-white'
                  }
                  rounded-lg shadow-lg p-4 flex items-center justify-between
                `}
              >
                <div className="flex items-center space-x-3">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    {notification.type === 'success' ? (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                  
                  {/* Message */}
                  <p className="text-sm font-medium">
                    {notification.message}
                  </p>
                </div>
                
                {/* Close Button */}
                <button
                  onClick={() => dismissNotification(notification.id)}
                  className="flex-shrink-0 ml-4 text-white hover:text-gray-200 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
  
        {/* Başlık - Responsive */}
        <div className="text-center max-w-4xl overflow-x-auto">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font text-gray-900 dark:text-white mb-4 md:mb-2 italic whitespace-nowrap inline-block">
            Emre & Zeynep
          </h1>
        </div>
        
        {/* Geri Sayım */}
        <div className="mb-6 md:mb-8 w-full max-w-sm sm:max-w-md md:max-w-lg">
          <div className="mb-1 md:mb-1 w-full max-w-sm sm:max-w-md md:max-w-lg">  
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 dark:text-white mb-3 md:mb-4 text-center">
              👰🤵 Düğüne Kalan Süre
            </h2>
          </div>
          <div className="bg-white from-white-500 text-black p-2 rounded-lg shadow-lg text-center">
            <div className="text-sm text-gray-600 mb-3 font-medium">
              📅 30 Ağustos 2025 - Saat 16:00
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-gray-200 rounded-lg p-1">
                <div className="text-lg font-bold">{timeLeft.days}</div>
                <div className="text-xs">Gün</div>
              </div>
              <div className="bg-gray-200  rounded-lg p-1">
                <div className="text-lg font-bold">{timeLeft.hours}</div>
                <div className="text-xs">Saat</div>
              </div>
              <div className="bg-gray-200 rounded-lg p-1">
                <div className="text-lg font-bold">{timeLeft.minutes}</div>
                <div className="text-xs">Dakika</div>
              </div>
              <div className="bg-gray-200 rounded-lg p-1">
                <div className="text-lg font-bold">{timeLeft.seconds}</div>
                <div className="text-xs">Saniye</div>
              </div>
            </div>
          </div>
        </div>
		
		{/* İsim Girişi Bölümü */}
        <div className="mb-6 md:mb-8 w-full max-w-sm sm:max-w-md md:max-w-lg">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 dark:text-white mb-3 md:mb-4 text-center">
            👤 İsim Bilgisi
          </h2>
          
          <div className="bg-white p-4 sm:p-5 md:p-6 rounded-lg shadow-lg border dark:text-black">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Bu mutlu günü bizimle paylaşacaksanız lütfen bildirin 💕
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Adınız ve Soyadınız"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                maxLength={50}
                autoComplete="off"
                spellCheck="false"
              />
              {userName.trim() && !isValidName(userName) && (
                <p className="text-xs text-orange-600">
                  ⚠️ Lütfen adınızı ve soyadınızı tam olarak girin
                </p>
              )}
                {/* Mevcut input alanından sonra, validation mesajlarından sonra ekle */}
                <button
                  onClick={handleAddParticipant}
                  disabled={!isValidName(userName) || isAddingParticipant || participantUploadThingUploading}
                    className={`py-2.5 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 text-sm mx-auto ${
                      !isValidName(userName) || isAddingParticipant || participantUploadThingUploading
                        ? "bg-gray-100 text-gray-500 cursor-not-allowed border border-gray-200"
                        : "bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg"
                    }`}
                >
                  {isAddingParticipant || participantUploadThingUploading ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>Check-in yapılıyor...</span>
                    </>
                  ) : (
                    <>
					  <span>✅</span>
                      <span>{!isValidName(userName) ? "İsminizi Giriniz" : "Check-In Yap"}</span>
                    </>
                  )}
                </button>
            </div>
          </div>
        </div>
		
        {/* Konum Bilgisi Bölümü */}
        <div className="mb-6 md:mb-8 w-full max-w-sm sm:max-w-md md:max-w-lg">  
         <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 dark:text-white mb-3 md:mb-4 text-center">
           📍 Düğün Salonu Konumu
         </h2>
         
         <div className="bg-white p-4 sm:p-5 md:p-6 rounded-lg shadow-lg border text-center">
           <div className="mb-4">
             <h3 className="font-semibold text-lg text-gray-800 mb-2">{weddingLocation.name}</h3>
             <p className="text-gray-600 text-sm">{weddingLocation.address}</p>
           </div>
           
           <div className="flex flex-col gap-3 items-center">
             <button
               onClick={openInMaps}
               className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
             >
               <span>🗺️</span>
               <span>Haritada Göster</span>
             </button>
             
             <button
               onClick={handleAddToCalendar}
               className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
             >
               <span>📅</span>
               <span>Takvime Ekle</span>
             </button>
           </div>
         </div>
        </div>
        
        <div className="mb-8 md:mb-2 text-center max-w-5xl">
         <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 dark:text-white px-4">
           Bu özel günümüzde çektiğiniz güzel anıları ve içten dileklerinizi bizimle paylaşabilirsiniz
         </p>
        </div>
        {/* Takvim Seçenekleri Modal'ı */}
        {showCalendarOptions && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-sm w-full p-6 space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  📅 Takvime Ekle
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Hangi takvim uygulamasını kullanmak istiyorsunuz?
                </p>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={() => {
                    addToGoogleCalendar();
                    setShowCalendarOptions(false);
                  }}
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <span>📅</span>
                  <span>Google Takvim</span>
                </button>
                
                <button
                  onClick={() => {
                    addToOutlookCalendar();
                    setShowCalendarOptions(false);
                  }}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <span>📅</span>
                  <span>Outlook Takvim</span>
                </button>
                
                <button
                  onClick={() => {
                    addToAppleCalendar();
                    setShowCalendarOptions(false);
                  }}
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <span>📅</span>
                  <span>Apple Takvim (.ics)</span>
                </button>
              </div>
              
              <button
                onClick={() => setShowCalendarOptions(false)}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              >
                İptal
              </button>
            </div>
          </div>
        )}
        
        {/* Fotoğraf/Video Yükleme - Mobile Responsive */}
        <div className="mb-6 md:mb-8 w-full max-w-sm sm:max-w-md md:max-w-lg">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 dark:text-white mb-3 md:mb-4 text-center">
            📸 Fotoğraf ve Video Yükleme
          </h2>
          
          {/* Dosya Seçim Alanı - Mobile Optimized */}
          <div
            className={`border-2 border-dashed rounded-lg p-4 sm:p-6 md:p-8 text-center transition-all duration-200 cursor-pointer ${
              isDragging 
                ? "border-blue-500 bg-blue-50" 
                : "border-gray-300 hover:border-gray-400 bg-gray-50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="text-4xl sm:text-5xl md:text-6xl mb-2 md:mb-4">📤</div>
            <p className="text-base sm:text-lg font-semibold text-gray-700 mb-1 md:mb-2">
              {isDragging ? "Dosyaları buraya bırakın" : "Dosya seçin veya sürükleyip bırakın"}
            </p>
            <p className="text-xs sm:text-sm text-gray-500 mb-3 md:mb-0">
              Resim ve videolar (Maks. 1GB)
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,.heic,.heif,.mov,.mp4,.jpeg,.jpg,.png,.gif,.webp,.avif"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <button
              type="button"
              className="mt-3 md:mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 sm:px-6 rounded-lg transition-colors duration-200 text-sm sm:text-base"
              onClick={(e) => {
                e.stopPropagation();
                // Input'u temizle ve tıkla
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                  fileInputRef.current.click();
                }
              }}
            >
              📁 Dosya Seç
            </button>
          </div>
  
          {/* Seçilen Dosyalar Listesi - Mobile Responsive */}
          {selectedFiles.length > 0 && (
            <div className="mt-3 md:mt-4 space-y-2">
              <h3 className="font-semibold text-gray-700 dark:text-white text-sm sm:text-base">Seçilen Dosyalar:</h3>
              <div className="max-h-32 sm:max-h-80 overflow-y-auto grid grid-cols-3 gap-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="bg-white border rounded-lg p-2 space-y-2">
                   {file.type.startsWith('image/') && (
                     <div className="relative w-full h-20">
                       <Image 
                         src={fileUrls.get(file) || ''} // Map'ten URL al
                         alt={file.name}
                         fill
                         className="object-cover rounded-lg"
                         sizes="(max-width: 768px) 33vw, 25vw"
                       />
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-xs sm:text-sm font-medium text-gray-700 truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-700 font-bold text-sm sm:text-base p-1"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Yükle Butonu - Mobile Responsive */}
              <button
                onClick={uploadFiles}
                disabled={
                  isUploadingFile || 
                  uploadThingUploading || 
                  selectedFiles.length === 0 || 
                  !isValidName(userName)  // İsim geçerli değilse buton deaktif
                }
                className={`w-full py-2.5 md:py-3 px-3 md:px-4 rounded-lg font-semibold transition-colors duration-200 flex items-center justify-center gap-2 text-sm sm:text-base ${
                  isUploadingFile || 
                  uploadThingUploading || 
                  selectedFiles.length === 0 || 
                  !isValidName(userName)  // İsim geçerli değilse gri renk
                    ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700 text-white"
                }`}
              >
                {isUploadingFile || uploadThingUploading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span className="hidden sm:inline">Yükleniyor...</span>
                    <span className="sm:hidden">Yükleniyor</span>
                    {uploadProgress > 0 && <span>%{uploadProgress}</span>}
                  </>
                ) : (
                  <>
                    <span>⬆️</span>
                    <span className="hidden sm:inline">
                      {!isValidName(userName) 
                        ? "İsiminizi Giriniz" 
                        : `${selectedFiles.length} Dosyayı Yükle`
                      }
                    </span>
                    <span className="sm:hidden">
                      {!isValidName(userName) 
                        ? "İsminizi Giriniz" 
                        : `${selectedFiles.length} Dosya Yükle`
                      }
                    </span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
        {/* Birleştirilmiş Mesaj Yazma ve Ses Kaydı Bölümü - Mobile Responsive */}
        <div className="mt-2 mb-2 md:mb-5 w-full max-w-sm sm:max-w-md md:max-w-lg">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 dark:text-white mb-3 md:mb-4 text-center">
            💌 Mesaj Gönder
          </h2>      
          
          {/* Ana Kart - Tek Arka Plan */}
          <div className="bg-white p-4 sm:p-5 md:p-6 rounded-lg shadow-lg border">
            
            {/* Seçenek Butonları */}
            <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
              <button
                onClick={() => setActiveTab('text')}
                className={`flex-1 py-2 px-3 rounded-md font-medium text-sm transition-all duration-200 ${
                  activeTab === 'text' 
                    ? 'bg-white text-purple-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                📝 Metin Mesajı
              </button>
              <button
                onClick={() => setActiveTab('voice')}
                className={`flex-1 py-2 px-3 rounded-md font-medium text-sm transition-all duration-200 ${
                  activeTab === 'voice' 
                    ? 'bg-white text-red-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                🎤 Ses Kaydı
              </button>
            </div>

            {/* Metin Mesajı Bölümü */}
            {activeTab === 'text' && (
              <div className="min-h-[400px] flex flex-col">
                {/* Başlık ve Açıklama */}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Metin Mesajı</h3>
                  <p className="text-gray-600 text-sm">
                    Düşüncelerinizi metin olarak paylaşın.<br/>
                    Maksimum 1000 karakter kullanabilirsiniz.
                  </p>
                </div>

                {/* İçerik Alanı */}
                <div className="flex-1 flex flex-col justify-center">
                  <div className="space-y-4 dark:text-black">
                    <div>
                      <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Düğün için güzel dileklerinizi, anılarınızı veya mesajınızı buraya yazabilirsiniz..."
                        className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base resize-none shadow-sm"
                        rows={6}
                        maxLength={1000}
                      />
                      <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
                        <span>Maksimum 1000 karakter</span>
                        <span className={noteText.length > 900 ? 'text-orange-500 font-medium' : ''}>
                          {noteText.length}/1000
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gönder Butonu */}
                <div className="mt-6">
                  <button
                    onClick={uploadNote}
                    disabled={isUploadingNote || noteUploadThingUploading || !noteText.trim() || !isValidName(userName)}
                    className={`w-full py-4 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-3 text-base shadow-lg ${
                      isUploadingNote || noteUploadThingUploading || !noteText.trim() || !isValidName(userName)
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white hover:shadow-xl transform active:scale-95"
                    }`}
                  >
                    {(isUploadingNote || noteUploadThingUploading) ? (
                      <>
                        <span className="animate-spin text-xl">⏳</span>
                        <span>Gönderiliyor...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-xl">📤</span>
                        <span>
                          {!isValidName(userName) 
                            ? "İsiminizi Giriniz" 
                            : "Mesajı Gönder"
                          }
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Ses Kaydı Bölümü */}
            {activeTab === 'voice' && (
              <div className="min-h-[400px] flex flex-col">
                
                {!audioBlob ? (
                  // Kayıt Öncesi Durumu
                  <>
                    {/* Başlık ve Açıklama */}
                    <div className="text-center mb-6">
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">Sesli Mesaj</h3>
                      <p className="text-gray-600 text-sm">
                        Düşüncelerinizi sesli olarak paylaşın.<br/>
                        Maksimum 5 dakika kayıt yapabilirsiniz.
                      </p>
                    </div>

                    {/* İçerik Alanı */}
                    <div className="flex-1 flex flex-col justify-center items-center">
                      {!isRecording ? (
                        <div className="text-center">
                          <div className="bg-gray-50 rounded-xl p-8 border border-gray-200 mb-6">
                            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                              <span className="text-2xl text-gray-400">🎙️</span>
                            </div>
                            <p className="text-gray-600 text-sm">
                              Kayda başlamak için butona basın
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full max-w-xs">
                          <div className="bg-red-50 rounded-xl p-6 border border-red-200 text-center">
                            <div className="flex items-center justify-center gap-3 mb-3">
                              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                              <span className="text-2xl font-mono text-red-700 font-bold">
                                {formatTime(recordingTime)}
                              </span>
                            </div>
                            <p className="text-red-700 font-medium text-sm">
                              Kayıt devam ediyor...
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Kayıt Butonu */}
                    <div className="mt-6">
                      {!isRecording ? (
                        <button
                          onClick={handleStartRecording}
                          className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:scale-95"
                        >
                          <span className="text-xl">🎙️</span>
                          <span>Kayda Başla</span>
                        </button>
                      ) : (
                        <button
                          onClick={stopRecording}
                          className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:scale-95"
                        >
                          <span className="text-xl">⏹️</span>
                          <span>Kaydı Durdur</span>
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  // Kayıt Sonrası Durumu
                  <>
                    {/* Başlık ve Açıklama */}
                    <div className="text-center mb-6">
                      <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <span className="text-3xl text-white">✓</span>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">
                        {isConverting ? "İşleniyor..." : "Kayıt Hazır!"}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Süre: {formatTime(recordingTime)}
                        {userName.trim() && (
                          <span className="block mt-1">Kayıt: {userName}</span>
                        )}
                      </p>
                    </div>

                    {/* İçerik Alanı - Ses Oynatıcı */}
                    <div className="flex-1 flex flex-col justify-center">
                      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                        <audio 
                          controls 
                          className="w-full" 
                          src={audioUrl ?? undefined}
                          style={{height: '44px'}}
                        >
                          Tarayıcınız ses oynatmayı desteklemiyor.
                        </audio>
                      </div>
                    </div>

                    {/* Butonlar */}
                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={uploadAudio}
                        disabled={isUploading || audioUploadThingUploading || isConverting || !isValidName(userName)}
                        className={`flex-1 font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-lg ${
                          isUploading || audioUploadThingUploading || isConverting || !isValidName(userName) 
                            ? "bg-gray-200 text-gray-500 cursor-not-allowed" 
                            : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white hover:shadow-xl transform active:scale-95"
                        }`}
                      >
                        {(isUploading || audioUploadThingUploading) ? (
                          <>
                            <span className="animate-spin text-xl">⏳</span>
                            <span>Yükleniyor</span>
                          </>
                        ) : isConverting ? (
                          <>
                            <span className="animate-spin text-xl">🔄</span>
                            <span>İşleniyor</span>
                          </>
                        ) : (
                          <>
                            <span className="text-xl">📤</span>
                            <span>
                              {!isValidName(userName) ? "İsminizi Giriniz" : "Kaydı Yükle"}
                            </span>
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={deleteRecording}
                        className="bg-red-500 hover:bg-red-600 text-gray-600 hover:text-red-600 font-semibold py-4 px-4 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md transform  active:scale-95 border border-gray-200 hover:border-red-200"
                      >
                        <span className="text-xl">🗑️</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    );
}