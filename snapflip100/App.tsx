/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { loadStripe } from "@stripe/stripe-js";
import { 
  auth, 
  db, 
  googleProvider, 
  handleFirestoreError, 
  OperationType 
} from './firebase';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  orderBy,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';

// Initialize Stripe
const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) 
  : null;

import { 
  Camera, 
  Plus, 
  LayoutDashboard, 
  Package, 
  TrendingUp, 
  ArrowRight, 
  Check, 
  X, 
  Copy, 
  Save,
  Download,
  ChevronRight,
  DollarSign,
  BarChart3,
  Search,
  Loader2,
  User as UserIcon,
  Mail,
  LogOut,
  Image as ImageIcon,
  MapPin,
  Navigation,
  History,
  Clock,
  Play,
  Square,
  Map as MapIcon,
  Shield,
  Zap,
  Star,
  Infinity as InfinityIcon,
  Lock,
  Key,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { analyzeItemImage, removeBackground } from './services/geminiService';
import { Item, DashboardStats, Profile, Trip } from './types';
import { LegalModal } from './components/LegalModal';

export default function App() {
  const [view, setView] = useState<'dashboard' | 'capture' | 'analysis' | 'inventory' | 'profile' | 'setup' | 'users' | 'tracker' | 'listing-package' | 'mark-as-sold' | 'plans'>('dashboard');
  const [user, setUser] = useState<Profile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [inventory, setInventory] = useState<Item[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [purchasePrice, setPurchasePrice] = useState<string>('');
  const [targetSalePrice, setTargetSalePrice] = useState<string>('');
  const [selectedMarketplace, setSelectedMarketplace] = useState<Item['marketplace']>('eBay');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  const [resetLinkGenerated, setResetLinkGenerated] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [listingItem, setListingItem] = useState<any>(null);
  const [itemToMarkAsSold, setItemToMarkAsSold] = useState<Item | null>(null);
  const [soldPrice, setSoldPrice] = useState<string>('');
  const [shippingCost, setShippingCost] = useState<string>('0');
  const [marketplaceFee, setMarketplaceFee] = useState<string>('');
  const [marketplaceSoldOn, setMarketplaceSoldOn] = useState<Item['marketplace']>('eBay');
  const [inventoryFilter, setInventoryFilter] = useState<'All' | 'Available' | 'Sold'>('All');
  const [showDelistPanel, setShowDelistPanel] = useState(false);
  const [delistItem, setDelistItem] = useState<Item | null>(null);

  // Mileage Tracker State
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTrip, setActiveTrip] = useState<{
    startTime: string;
    startCoords: { lat: number; lon: number };
    startLocation: string;
  } | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [currentMiles, setCurrentMiles] = useState(0);
  const [tripNotes, setTripNotes] = useState('');
  const [isSavingTrip, setIsSavingTrip] = useState(false);

  // Subscription State
  const [isSavingSubscription, setIsSavingSubscription] = useState(false);
  const [isUpdatingUser, setIsUpdatingUser] = useState<string | null>(null);

  // Admin Email
  const ADMIN_EMAIL = 'saritaevans11@gmail.com';

  // Setup form state
  const [setupFirstName, setSetupFirstName] = useState('');
  const [setupLastName, setSetupLastName] = useState('');
  const [setupEmail, setSetupEmail] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirmPassword, setSetupConfirmPassword] = useState('');
  const [setupPhoto, setSetupPhoto] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [authView, setAuthView] = useState<'choice' | 'signup' | 'signin' | 'forgot-password' | 'reset-password'>('choice');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState<string | null>(null);
  const [isIframe, setIsIframe] = useState(false);

  // Legal State
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalModalType, setLegalModalType] = useState<'privacy' | 'terms'>('terms');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const profilePhotoRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    });
  };

  useEffect(() => {
    setIsIframe(window.self !== window.top);

    const unsubscribe = onAuthStateChanged(auth, async (fUser) => {
      setFirebaseUser(fUser);
      if (fUser) {
        const userDoc = await getDoc(doc(db, 'profiles', fUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data() as Profile;
          if (fUser.email === ADMIN_EMAIL && data.subscriptionTier !== 'Admin') {
            await updateDoc(doc(db, 'profiles', fUser.uid), { 
              subscriptionTier: 'Admin',
              maxLookups: 999999
            });
            data.subscriptionTier = 'Admin';
            data.maxLookups = 999999;
          }
          setUser({ id: fUser.uid, ...data } as Profile);
          setView('dashboard');
        } else {
          // Create profile if it doesn't exist
          const isInitialAdmin = fUser.email === ADMIN_EMAIL;
          const newProfile: Profile = {
            email: fUser.email || '',
            name: fUser.displayName || '',
            photo: fUser.photoURL || '',
            subscriptionTier: isInitialAdmin ? 'Admin' : 'Free',
            lookupCount: 0,
            maxLookups: isInitialAdmin ? 999999 : 10,
            createdAt: serverTimestamp()
          };
          await setDoc(doc(db, 'profiles', fUser.uid), newProfile);
          setUser({ id: fUser.uid, ...newProfile });
          setView('dashboard');
        }
      } else {
        setUser(null);
        setView('setup');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (firebaseUser) {
      const unsubscribeProfile = onSnapshot(doc(db, 'profiles', firebaseUser.uid), (doc) => {
        if (doc.exists()) {
          setUser({ id: doc.id, ...doc.data() } as Profile);
        }
      });
      return () => unsubscribeProfile();
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (user && firebaseUser) {
      // Inventory listener
      const q = query(collection(db, 'items'), where('userId', '==', firebaseUser.uid), orderBy('createdAt', 'desc'));
      const unsubscribeInventory = onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Item));
        setInventory(items);
        updateStats(items, trips);
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'items'));

      // Trips listener
      const tq = query(collection(db, 'trips'), where('userId', '==', firebaseUser.uid), orderBy('createdAt', 'desc'));
      const unsubscribeTrips = onSnapshot(tq, (snapshot) => {
        const tripList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trip));
        setTrips(tripList);
        updateStats(inventory, tripList);
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'trips'));

      if (user.subscriptionTier === 'Admin') {
        const uq = query(collection(db, 'profiles'), orderBy('createdAt', 'desc'));
        const unsubscribeUsers = onSnapshot(uq, (snapshot) => {
          setAllUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => {
          unsubscribeInventory();
          unsubscribeTrips();
          unsubscribeUsers();
        };
      }

      return () => {
        unsubscribeInventory();
        unsubscribeTrips();
      };
    }
  }, [user, firebaseUser]);

  const updateStats = (items: Item[], tripList: Trip[]) => {
    const totalItems = items.length;
    const totalProfit = items.reduce((sum, item) => sum + (item.status === 'Sold' ? (item.actualProfit || 0) : (item.estimatedProfit || 0)), 0);
    const totalListed = items.filter(i => i.status === 'Posted').length;
    const totalSold = items.filter(i => i.status === 'Sold').length;
    
    const brandMap = new Map();
    items.forEach(item => {
      const brand = item.brand || 'Unknown';
      const profit = item.status === 'Sold' ? (item.actualProfit || 0) : (item.estimatedProfit || 0);
      const current = brandMap.get(brand) || { count: 0, profit: 0 };
      brandMap.set(brand, { count: current.count + 1, profit: current.profit + profit });
    });
    const brandSummary = Array.from(brandMap.entries()).map(([brand, data]) => ({ brand, ...data })).sort((a, b) => b.profit - a.profit);

    const marketplaceMap = new Map();
    items.forEach(item => {
      const mp = item.marketplace || 'eBay';
      marketplaceMap.set(mp, (marketplaceMap.get(mp) || 0) + 1);
    });
    const marketplaceSummary = Array.from(marketplaceMap.entries()).map(([marketplace, count]) => ({ marketplace, count }));

    const currentYear = new Date().getFullYear();
    const totalMilesYTD = tripList
      .filter(t => t.date && t.date.startsWith(currentYear.toString()))
      .reduce((sum, t) => sum + (t.miles || 0), 0);

    setStats({ totalItems, totalProfit, totalListed, totalSold, brandSummary, marketplaceSummary, totalMilesYTD });
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Google login failed", error);
      alert("Google login failed. Please try again.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (setupPassword !== setupConfirmPassword) return alert("Passwords do not match");
    if (!agreedToTerms || !agreedToPrivacy) return alert("Please agree to the Terms and Privacy Policy");

    setIsGoogleLoading(true);
    try {
      const { user: fUser } = await createUserWithEmailAndPassword(auth, setupEmail, setupPassword);
      await updateProfile(fUser, { displayName: `${setupFirstName} ${setupLastName}` });
      
      const isInitialAdmin = setupEmail.toLowerCase() === ADMIN_EMAIL;
      const newProfile: Profile = {
        email: setupEmail.toLowerCase(),
        name: `${setupFirstName} ${setupLastName}`,
        photo: setupPhoto || '',
        subscriptionTier: isInitialAdmin ? 'Admin' : 'Free',
        lookupCount: 0,
        maxLookups: isInitialAdmin ? 999999 : 10,
        createdAt: serverTimestamp()
      };
      await setDoc(doc(db, 'profiles', fUser.uid), newProfile);
      setUser({ id: fUser.uid, ...newProfile });
      setView('dashboard');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGoogleLoading(true);
    try {
      await signInWithEmailAndPassword(auth, setupEmail, setupPassword);
    } catch (error: any) {
      console.error("Login error:", error);
      alert(error.message || "Login failed. Please check your credentials.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setFirebaseUser(null);
    setView('setup');
  };

  const handleSaveItem = async () => {
    if (!user || !firebaseUser) return;
    setIsSaving(true);
    try {
      const newItem: Item = {
        userId: firebaseUser.uid,
        name: analysisResult.itemName || analysisResult.suggestedTitle || "Untitled",
        brand: analysisResult.brand || "Unknown",
        type: analysisResult.type || "Other",
        condition: analysisResult.condition || "Used",
        purchasePrice: parseFloat(purchasePrice) || 0,
        averageResalePrice: analysisResult.estimatedResalePrice || 0,
        estimatedProfit: (analysisResult.estimatedResalePrice || 0) - (parseFloat(purchasePrice) || 0),
        sellThroughRate: analysisResult.sellThroughRate || "Medium",
        marketplace: selectedMarketplace,
        photo: photo || "",
        description: analysisResult.suggestedDescription || "",
        status: 'Draft',
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'items'), newItem);
      
      // Increment lookup count
      await updateDoc(doc(db, 'profiles', firebaseUser.uid), {
        lookupCount: (user.lookupCount || 0) + 1
      });

      setSaveSuccess("Item saved to inventory!");
      setTimeout(() => {
        setSaveSuccess(null);
        setView('inventory');
      }, 2000);
    } catch (error) {
      console.error("Save error", error);
      alert("Failed to save item.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkAsSold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemToMarkAsSold || !itemToMarkAsSold.id) return;
    
    setIsSaving(true);
    try {
      const sPrice = parseFloat(soldPrice);
      const sCost = parseFloat(shippingCost);
      const mFee = parseFloat(marketplaceFee);
      const profit = sPrice - sCost - mFee - (itemToMarkAsSold.purchasePrice || 0);

      await updateDoc(doc(db, 'items', itemToMarkAsSold.id), {
        status: 'Sold',
        soldPrice: sPrice,
        shippingCost: sCost,
        marketplaceFee: mFee,
        marketplaceSoldOn,
        actualProfit: profit
      });

      setItemToMarkAsSold(null);
      setView('inventory');
    } catch (error) {
      alert("Failed to update item.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTrip = async () => {
    if (!user || !firebaseUser) return;
    setIsSavingTrip(true);
    try {
      await addDoc(collection(db, 'trips'), {
        userId: firebaseUser.uid,
        date: new Date().toISOString().split('T')[0],
        startLocation: activeTrip?.startLocation || 'Unknown',
        endLocation: 'Current Location',
        miles: currentMiles,
        notes: tripNotes,
        createdAt: serverTimestamp()
      });
      setIsTracking(false);
      setActiveTrip(null);
      setCurrentMiles(0);
      setTripNotes('');
      setView('tracker');
    } catch (error) {
      alert("Failed to save trip.");
    } finally {
      setIsSavingTrip(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      await deleteDoc(doc(db, 'items', id));
    } catch (error) {
      alert("Failed to delete item.");
    }
  };

  const handleUpdateUserTier = async (userId: string, tier: string) => {
    setIsUpdatingUser(userId);
    try {
      const maxLookups = tier === 'Pro' ? 100 : (tier === 'Unlimited' || tier === 'Admin' ? 999999 : 10);
      await updateDoc(doc(db, 'profiles', userId), {
        subscriptionTier: tier,
        maxLookups
      });
    } catch (error) {
      alert("Failed to update user.");
    } finally {
      setIsUpdatingUser(null);
    }
  };

  const handleAnalyze = async (imageSrc?: string | any) => {
    console.log("handleAnalyze triggered", { 
      hasImageSrc: !!imageSrc, 
      imageSrcType: typeof imageSrc,
      hasPhoto: !!photo,
      userLookupCount: user?.lookupCount,
      userMaxLookups: user?.maxLookups,
      subscriptionTier: user?.subscriptionTier,
    });

    const finalImageSrc = typeof imageSrc === 'string' ? imageSrc : photo;
    
    if (!finalImageSrc) {
      console.warn("No image source found for analysis");
      alert("Please take a photo first.");
      return;
    }

    if (user && user.lookupCount !== undefined && user.maxLookups !== undefined && user.lookupCount >= user.maxLookups && user.subscriptionTier === 'Free') {
      console.warn("Lookup limit reached");
      alert("You have reached your lookup limit. Please upgrade your plan.");
      setView('plans');
      return;
    }
    
    console.log("Setting isAnalyzing to true");
    setIsAnalyzing(true);
    try {
      console.log("Calling analyzeItemImage...");
      const result = await analyzeItemImage(finalImageSrc);
      console.log("Analysis successful:", result);
      setAnalysisResult(result);
      setTargetSalePrice(result.estimatedResalePrice.toString());
      setView('analysis');
      
      // Increment lookup count
      if (firebaseUser) {
        console.log("Updating lookup count in Firestore");
        await updateDoc(doc(db, 'profiles', firebaseUser.uid), {
          lookupCount: (user?.lookupCount || 0) + 1
        });
      }
    } catch (error: any) {
      console.error("Analysis error in handleAnalyze:", error);
      alert(`AI analysis failed: ${error.message || "Please try again."}`);
    } finally {
      console.log("Setting isAnalyzing to false");
      setIsAnalyzing(false);
    }
  };

  const handleRemoveBackground = async () => {
    console.log("handleRemoveBackground triggered", { hasPhoto: !!photo });
    if (!photo) return;
    setIsRemovingBackground(true);
    try {
      console.log("Calling removeBackground...");
      const editedImage = await removeBackground(photo);
      console.log("Background removal successful");
      setPhoto(editedImage);
    } catch (error: any) {
      console.error("Background removal failed", error);
      alert(`Failed to remove background: ${error.message || "Please try again."}`);
    } finally {
      console.log("Setting isRemovingBackground to false");
      setIsRemovingBackground(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const compressed = await compressImage(base64);
        setPhoto(compressed);
        handleAnalyze(compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStripeCheckout = async (tier: string) => {
    if (!user) return;
    if (!stripePromise) {
      alert("Stripe is not configured yet. Please add your Stripe keys in the settings menu to enable payments.");
      return;
    }
    setIsSavingSubscription(true);
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, userEmail: user.email })
      });
      const data = await response.json();
      if (data.error) {
        alert(`Stripe Error: ${data.error}`);
        return;
      }
      if (data.url) window.location.href = data.url;
    } catch (error) {
      alert("Stripe checkout failed. Please check your connection and try again.");
    } finally {
      setIsSavingSubscription(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 3958.8; // Radius of the Earth in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getReverseGeocode = async (lat: number, lon: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
      const data = await res.json();
      // Extract a shorter address if possible
      const address = data.address;
      if (address) {
        const parts = [address.road, address.city || address.town || address.village].filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : data.display_name.split(',').slice(0, 2).join(',');
      }
      return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    } catch (e) {
      return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    setIsSaving(true);
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const setupData = {
        name: formData.get('name') as string,
        firstName: formData.get('firstName') as string,
        lastName: formData.get('lastName') as string,
        email: firebaseUser.email,
        subscriptionTier: 'Free',
        lookupCount: 0,
        maxLookups: 10,
        createdAt: serverTimestamp()
      };
      await setDoc(doc(db, 'profiles', firebaseUser.uid), setupData);
      setUser(setupData as any);
      setView('dashboard');
    } catch (error) {
      alert("Setup failed. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e && 'preventDefault' in e) e.preventDefault();
    if (!firebaseUser || !analysisResult) {
      console.error("Missing user or analysis result", { firebaseUser, analysisResult });
      return;
    }
    
    setIsSaving(true);
    const path = 'items';
    try {
      const itemName = (analysisResult.itemName || analysisResult.suggestedTitle || 'Unknown Item').slice(0, 190);
      const pPrice = parseFloat(purchasePrice) || 0;
      const rPrice = parseFloat(targetSalePrice) || analysisResult.estimatedResalePrice || 0;
      
      let compressedPhoto = photo || '';
      if (compressedPhoto && compressedPhoto.length > 500000) { // If > 0.5MB base64
        compressedPhoto = await compressImage(compressedPhoto, 600, 600, 0.6);
      }

      const newItem = {
        userId: firebaseUser.uid,
        name: itemName,
        brand: (analysisResult.brand || 'Unknown Brand').slice(0, 100),
        type: analysisResult.type || 'Other',
        condition: analysisResult.condition || 'Used',
        purchasePrice: isNaN(pPrice) ? 0 : pPrice,
        averageResalePrice: isNaN(rPrice) ? 0 : rPrice,
        estimatedProfit: (isNaN(rPrice) ? 0 : rPrice) - (isNaN(pPrice) ? 0 : pPrice),
        sellThroughRate: analysisResult.sellThroughRate || 'Medium',
        marketplace: selectedMarketplace,
        photo: compressedPhoto,
        description: analysisResult.suggestedDescription || '',
        status: 'Draft',
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, path), newItem);
      
      setSaveSuccess("Item saved to inventory!");
      setTimeout(() => setSaveSuccess(null), 3000);
      
      setView('inventory');
      setAnalysisResult(null);
      setPhoto(null);
      setPurchasePrice('');
      setTargetSalePrice('');
    } catch (error) {
      console.error("Save error:", error);
      try {
        handleFirestoreError(error, OperationType.CREATE, path);
      } catch (err: any) {
        alert(`Failed to save item: ${err.message}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    // Firebase doesn't have a simple "send reset link" without a lot of config for custom domains in this env
    // But we can simulate it or just tell the user to use Google login
    alert("Password reset is not available in this demo. Please use Google Login.");
    setResetLinkGenerated(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    alert("Password reset is not available in this demo.");
  };

  const startTrip = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      const locationName = await getReverseGeocode(latitude, longitude);
      
      setActiveTrip({
        startTime: new Date().toISOString(),
        startCoords: { lat: latitude, lon: longitude },
        startLocation: locationName
      });
      setIsTracking(true);
      setCurrentMiles(0);
    }, (error) => {
      alert("Error getting location: " + error.message);
    });
  };

  const stopTrip = () => {
    if (!activeTrip) return;

    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      const endLocation = await getReverseGeocode(latitude, longitude);
      const finalMiles = calculateDistance(
        activeTrip.startCoords.lat, 
        activeTrip.startCoords.lon, 
        latitude, 
        longitude
      );

      handleSaveTrip(); // Use the Firebase handler

      setActiveTrip(null);
      setIsTracking(false);
      setTripNotes('');
      setCurrentMiles(0);
    });
  };

  useEffect(() => {
    let interval: any;
    if (isTracking && activeTrip) {
      interval = setInterval(() => {
        navigator.geolocation.getCurrentPosition((position) => {
          const { latitude, longitude } = position.coords;
          const miles = calculateDistance(
            activeTrip.startCoords.lat, 
            activeTrip.startCoords.lon, 
            latitude, 
            longitude
          );
          setCurrentMiles(miles);
        });
      }, 10000); // Update every 10 seconds
    }
    return () => clearInterval(interval);
  }, [isTracking, activeTrip]);

  const updateSubscription = async (tier: 'Free' | 'Pro' | 'Unlimited') => {
    if (!user || !firebaseUser) return;
    
    // For free tier, just update directly
    if (tier === 'Free') {
      setIsSavingSubscription(true);
      try {
        await updateDoc(doc(db, 'profiles', firebaseUser.uid), {
          subscriptionTier: tier,
          maxLookups: 10
        });
        setView('profile');
      } catch (error) {
        console.error("Failed to update subscription", error);
      } finally {
        setIsSavingSubscription(false);
      }
      return;
    }

    // For paid tiers, use Stripe
    handleStripeCheckout(tier);
  };

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const compressed = await compressImage(base64);
        setPhoto(compressed);
        setView('capture');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfilePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const compressed = await compressImage(base64, 400, 400, 0.6);
        setSetupPhoto(compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoutUI = async () => {
    await handleLogout();
  };

  const updateItemStatus = async (id: string, status: Item['status']) => {
    if (status === 'Sold') {
      const item = inventory.find(i => i.id === id);
      if (item) {
        setItemToMarkAsSold(item);
        setSoldPrice(item.averageResalePrice.toString());
        // Default fee calculation (e.g. 13% for eBay)
        const fee = (item.averageResalePrice * 0.13).toFixed(2);
        setMarketplaceFee(fee);
        setView('mark-as-sold');
        return;
      }
    }

    try {
      await updateDoc(doc(db, 'items', id), { status });
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  const downloadImage = (base64Data: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = base64Data;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openMarketplace = async (item: Partial<Item>, targetMarketplace?: Item['marketplace'], isDelisting: boolean = false) => {
    const marketplace = targetMarketplace || item.marketplace;
    if (!isDelisting) setIsPosting(true);
    try {
      const title = encodeURIComponent(item.name || '');
      const description = encodeURIComponent(item.description || '');
      const price = item.averageResalePrice || 0;
      
      let url = '';
      if (isDelisting) {
        // Delisting URLs - pointing to active listings/my items pages
        switch (marketplace) {
          case 'eBay':
            url = `https://www.ebay.com/mys/active`;
            break;
          case 'Poshmark':
            url = `https://poshmark.com/closet`;
            break;
          case 'Mercari':
            url = `https://www.mercari.com/mypage/listings/active/`;
            break;
          case 'Facebook Marketplace':
            url = `https://www.facebook.com/marketplace/you/selling`;
            break;
          default:
            url = 'https://www.google.com';
        }
      } else {
        // Posting URLs
        switch (marketplace) {
          case 'eBay':
            url = `https://www.ebay.com/sl/sell?title=${title}`;
            break;
          case 'Poshmark':
            url = `https://poshmark.com/listing/new?title=${title}&description=${description}&price=${price}`;
            break;
          case 'Mercari':
            url = `https://www.mercari.com/sell/?title=${title}&description=${description}&price=${price}`;
            break;
          case 'Facebook Marketplace':
            url = `https://www.facebook.com/marketplace/create/item?title=${title}&description=${description}&price=${price}`;
            break;
          default:
            url = 'https://www.google.com';
        }
      }

      window.open(url, '_blank');

      // Update status in DB only if it's a saved item and NOT delisting
      if (!isDelisting && item.id) {
        await updateDoc(doc(db, 'items', item.id), { status: 'Posted' });
      }
    } catch (error) {
      console.error(isDelisting ? "Delist failed" : "Post failed", error);
    } finally {
      if (!isDelisting) setIsPosting(false);
    }
  };

  const handlePost = (item: Partial<Item>) => {
    setListingItem(item);
    setView('listing-package');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    
    if (paymentStatus === 'success') {
      setSaveSuccess("Subscription upgraded successfully!");
      // Clear the URL parameter
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (paymentStatus === 'cancel') {
      alert("Payment was cancelled.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user?.email]);

  useEffect(() => {
    // No manual fetch needed, onSnapshot handles it
  }, [view]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-[#1A1A1A] animate-spin mx-auto" />
          <p className="font-display italic text-xl">SnapFlip is warming up...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-[#F5F5F0] shadow-2xl relative overflow-hidden">
      {/* Header */}
      {view !== 'setup' && (
        <header className="p-6 flex justify-between items-center bg-white/50 backdrop-blur-md sticky top-0 z-10">
          <h1 className="font-display text-2xl italic font-bold text-[#1A1A1A]">Snap Flip</h1>
          <div className="flex gap-2">
            <button 
              onClick={() => setView('dashboard')}
              className={`p-2 rounded-full transition-colors ${view === 'dashboard' ? 'bg-[#1A1A1A] text-white' : 'hover:bg-black/5'}`}
            >
              <LayoutDashboard size={20} />
            </button>
            <button 
              onClick={() => setView('inventory')}
              className={`p-2 rounded-full transition-colors ${view === 'inventory' ? 'bg-[#1A1A1A] text-white' : 'hover:bg-black/5'}`}
            >
              <Package size={20} />
            </button>
            <button 
              onClick={() => {
                if (user?.subscriptionTier === 'Unlimited') {
                  setView('tracker');
                } else {
                  alert("Mileage tracking and advanced stats are only available on the Unlimited plan. Upgrade to unlock!");
                  setView('plans');
                }
              }}
              className={`p-2 rounded-full transition-colors ${view === 'tracker' ? 'bg-[#1A1A1A] text-white' : 'hover:bg-black/5'}`}
            >
              <BarChart3 size={20} />
            </button>
            <button 
              onClick={() => setView('profile')}
              className={`p-2 rounded-full transition-colors ${view === 'profile' ? 'bg-[#1A1A1A] text-white' : 'hover:bg-black/5'}`}
            >
              <UserIcon size={20} />
            </button>
            {user?.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() && (
              <button 
                onClick={() => setView('users')}
                className={`p-2 rounded-full transition-colors ${view === 'users' ? 'bg-[#1A1A1A] text-white' : 'hover:bg-black/5'}`}
              >
                <Search size={20} />
              </button>
            )}
          </div>
        </header>
      )}

      <main className="flex-1 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">
          {saveSuccess && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-2xl font-bold flex items-center gap-2"
            >
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">✓</div>
              {saveSuccess}
            </motion.div>
          )}
          {view === 'setup' && (
            <motion.div 
              key="setup"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-8 flex flex-col items-center justify-center min-h-full"
            >
              <div className="w-20 h-20 bg-[#1A1A1A] rounded-3xl flex items-center justify-center mb-6 shadow-xl">
                <TrendingUp size={40} className="text-white" />
              </div>

              {authView === 'choice' && (
                <div className="w-full space-y-6 text-center">
                  <h2 className="font-display text-3xl italic font-bold mb-2">Snap Flip</h2>
                  <p className="text-black/40 mb-8">Track your inventory, analyze profits, and scale your reselling business.</p>
                  
                  <div className="space-y-4">
                    <button 
                      onClick={() => setAuthView('signup')}
                      className="w-full py-5 bg-[#1A1A1A] text-white rounded-full font-bold shadow-xl flex items-center justify-center gap-2"
                    >
                      Sign Up <ArrowRight size={20} />
                    </button>
                    <button 
                      onClick={() => setAuthView('signin')}
                      className="w-full py-5 bg-white border border-black/5 text-black rounded-full font-bold shadow-sm hover:bg-black/5 transition-colors"
                    >
                      Sign In
                    </button>
                  </div>

                  <div className="relative py-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-black/5"></div>
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase font-bold">
                      <span className="bg-[#f5f5f0] px-4 text-black/20">Or continue with</span>
                    </div>
                  </div>

                  <button 
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isGoogleLoading}
                    className="w-full py-5 bg-white border border-black/5 text-black rounded-full font-bold shadow-sm flex items-center justify-center gap-3 hover:bg-black/5 transition-colors disabled:opacity-50"
                  >
                    {isGoogleLoading ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.07-3.71 1.07-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.67-.35-1.39-.35-2.09s.13-1.42.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                    )}
                    Google
                  </button>

                  <div className="mt-12 pt-8 border-t border-black/5">
                    <p className="text-[10px] uppercase font-bold text-black/20 mb-4">Trouble Signing In?</p>
                    <button 
                      onClick={() => {
                        localStorage.removeItem('smartflip_user_email');
                        window.location.reload();
                      }}
                      className="text-xs font-bold text-black/40 hover:text-black transition-colors underline underline-offset-4"
                    >
                      Clear session and try again
                    </button>
                  </div>

                  {isIframe && (
                    <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-left">
                      <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-800">
                        <p className="font-bold uppercase tracking-wider mb-1">Iframe Detected</p>
                        <p className="opacity-80">Some browsers block authentication in embedded windows. If you have trouble logging in, please open the app in a new tab.</p>
                        <button 
                          onClick={() => window.open(window.location.href, '_blank')}
                          className="mt-2 text-amber-900 font-bold underline uppercase tracking-widest"
                        >
                          Open in New Tab
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {authView === 'signup' && (
                <div className="w-full space-y-6">
                  <div className="text-center">
                    <h2 className="font-display text-3xl italic font-bold mb-2">Create Account</h2>
                    <p className="text-black/40">Join the community of profitable resellers.</p>
                  </div>

                  <form onSubmit={handleEmailSignup} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-black/40 ml-4">First Name</label>
                        <input 
                          required
                          type="text" 
                          value={setupFirstName}
                          onChange={(e) => setSetupFirstName(e.target.value)}
                          className="w-full px-6 py-4 bg-white rounded-2xl outline-none focus:ring-2 ring-black/10 card-shadow"
                          placeholder="John"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-black/40 ml-4">Last Name</label>
                        <input 
                          required
                          type="text" 
                          value={setupLastName}
                          onChange={(e) => setSetupLastName(e.target.value)}
                          className="w-full px-6 py-4 bg-white rounded-2xl outline-none focus:ring-2 ring-black/10 card-shadow"
                          placeholder="Doe"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-black/40 ml-4">Email Address</label>
                      <div className="relative">
                        <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" />
                        <input 
                          required
                          type="email" 
                          value={setupEmail}
                          onChange={(e) => setSetupEmail(e.target.value)}
                          className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl outline-none focus:ring-2 ring-black/10 card-shadow"
                          placeholder="john@example.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-black/40 ml-4">Password</label>
                      <div className="relative">
                        <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" />
                        <input 
                          required
                          type="password" 
                          value={setupPassword}
                          onChange={(e) => setSetupPassword(e.target.value)}
                          className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl outline-none focus:ring-2 ring-black/10 card-shadow"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-black/40 ml-4">Confirm Password</label>
                      <div className="relative">
                        <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" />
                        <input 
                          required
                          type="password" 
                          value={setupConfirmPassword}
                          onChange={(e) => setSetupConfirmPassword(e.target.value)}
                          className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl outline-none focus:ring-2 ring-black/10 card-shadow"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    <div className="space-y-4 pt-2">
                      <div className="flex items-start gap-3 px-2">
                        <input 
                          id="terms-checkbox"
                          type="checkbox" 
                          checked={agreedToTerms}
                          onChange={(e) => setAgreedToTerms(e.target.checked)}
                          className="mt-1 w-4 h-4 rounded border-black/10 text-black focus:ring-black/5 cursor-pointer"
                        />
                        <label htmlFor="terms-checkbox" className="text-xs text-black/60 leading-tight cursor-pointer">
                          I agree to the <button type="button" onClick={() => { setLegalModalType('terms'); setIsLegalModalOpen(true); }} className="text-black font-bold underline underline-offset-2">Terms of Service</button> and acknowledge that the AI analyzer is not perfect and can be wrong.
                        </label>
                      </div>

                      <div className="flex items-start gap-3 px-2">
                        <input 
                          id="privacy-checkbox"
                          type="checkbox" 
                          checked={agreedToPrivacy}
                          onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                          className="mt-1 w-4 h-4 rounded border-black/10 text-black focus:ring-black/5 cursor-pointer"
                        />
                        <label htmlFor="privacy-checkbox" className="text-xs text-black/60 leading-tight cursor-pointer">
                          I have read and agree to the <button type="button" onClick={() => { setLegalModalType('privacy'); setIsLegalModalOpen(true); }} className="text-black font-bold underline underline-offset-2">Privacy Policy</button>.
                        </label>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-5 bg-[#1A1A1A] text-white rounded-full font-bold shadow-xl mt-4 flex items-center justify-center gap-2"
                    >
                      Sign Up <ArrowRight size={20} />
                    </button>

                    <div className="text-center">
                      <button 
                        type="button"
                        onClick={() => setAuthView('signin')}
                        className="text-xs font-bold text-black/40 hover:text-black transition-colors"
                      >
                        Already have an account? Sign In
                      </button>
                    </div>

                    <div className="relative py-4">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-black/5"></div>
                      </div>
                      <div className="relative flex justify-center text-[10px] uppercase font-bold">
                        <span className="bg-[#f5f5f0] px-4 text-black/20">Or</span>
                      </div>
                    </div>

                    <button 
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isGoogleLoading}
                      className="w-full py-4 bg-white border border-black/5 text-black rounded-full font-bold shadow-sm flex items-center justify-center gap-3 hover:bg-black/5 transition-colors disabled:opacity-50"
                    >
                      {isGoogleLoading ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.07-3.71 1.07-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.67-.35-1.39-.35-2.09s.13-1.42.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                      )}
                      Continue with Google
                    </button>
                  </form>
                </div>
              )}

              {authView === 'signin' && (
                <div className="w-full space-y-6">
                  <div className="text-center">
                    <h2 className="font-display text-3xl italic font-bold mb-2">Welcome Back</h2>
                    <p className="text-black/40">Sign in to your account.</p>
                  </div>

                  <form onSubmit={handleEmailLogin} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-black/40 ml-4">Email Address</label>
                      <div className="relative">
                        <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" />
                        <input 
                          required
                          type="email" 
                          value={setupEmail}
                          onChange={(e) => setSetupEmail(e.target.value)}
                          className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl outline-none focus:ring-2 ring-black/10 card-shadow"
                          placeholder="john@example.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center ml-4 mr-4">
                        <label className="text-[10px] uppercase font-bold text-black/40">Password</label>
                        <button 
                          type="button"
                          onClick={() => setAuthView('forgot-password')}
                          className="text-[10px] uppercase font-bold text-black/40 hover:text-black"
                        >
                          Forgot?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" />
                        <input 
                          required
                          type="password" 
                          value={setupPassword}
                          onChange={(e) => setSetupPassword(e.target.value)}
                          className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl outline-none focus:ring-2 ring-black/10 card-shadow"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-5 bg-[#1A1A1A] text-white rounded-full font-bold shadow-xl mt-4 flex items-center justify-center gap-2"
                    >
                      Sign In <ArrowRight size={20} />
                    </button>

                    <div className="text-center">
                      <button 
                        type="button"
                        onClick={() => setAuthView('signup')}
                        className="text-xs font-bold text-black/40 hover:text-black transition-colors"
                      >
                        Don't have an account? Sign Up
                      </button>
                    </div>

                    <div className="relative py-4">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-black/5"></div>
                      </div>
                      <div className="relative flex justify-center text-[10px] uppercase font-bold">
                        <span className="bg-[#f5f5f0] px-4 text-black/20">Or</span>
                      </div>
                    </div>

                    <button 
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isGoogleLoading}
                      className="w-full py-4 bg-white border border-black/5 text-black rounded-full font-bold shadow-sm flex items-center justify-center gap-3 hover:bg-black/5 transition-colors disabled:opacity-50"
                    >
                      {isGoogleLoading ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.07-3.71 1.07-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.67-.35-1.39-.35-2.09s.13-1.42.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                      )}
                      Continue with Google
                    </button>
                  </form>
                </div>
              )}

              {authView === 'forgot-password' && (
                <div className="w-full space-y-6">
                  <div className="text-center">
                    <h2 className="font-display text-3xl italic font-bold mb-2">Forgot Password</h2>
                    <p className="text-black/40">Enter your email to receive a reset link.</p>
                  </div>

                  {resetLinkGenerated ? (
                    <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-3xl space-y-4">
                      <p className="text-sm text-emerald-800 font-medium">Reset link generated successfully!</p>
                      <p className="text-xs text-emerald-700 opacity-80">Since email sending is not configured in this environment, please use the button below to reset your password.</p>
                      <button 
                        onClick={() => window.location.href = resetLinkGenerated}
                        className="w-full py-4 bg-emerald-600 text-white rounded-full font-bold shadow-lg flex items-center justify-center gap-2"
                      >
                        Reset Password Now <ArrowRight size={18} />
                      </button>
                      <button 
                        onClick={() => {
                          setResetLinkGenerated(null);
                          setAuthView('signin');
                        }}
                        className="w-full py-2 text-xs font-bold text-emerald-800/60 uppercase tracking-widest"
                      >
                        Back to Sign In
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-black/40 ml-4">Email Address</label>
                        <div className="relative">
                          <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" />
                          <input 
                            required
                            type="email" 
                            value={setupEmail}
                            onChange={(e) => setSetupEmail(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl outline-none focus:ring-2 ring-black/10 card-shadow"
                            placeholder="john@example.com"
                          />
                        </div>
                      </div>

                      <button 
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-5 bg-[#1A1A1A] text-white rounded-full font-bold shadow-xl mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isLoading ? <Loader2 size={20} className="animate-spin" /> : <>Send Reset Link <ArrowRight size={20} /></>}
                      </button>

                      <div className="text-center">
                        <button 
                          type="button"
                          onClick={() => setAuthView('signin')}
                          className="text-xs font-bold text-black/40 hover:text-black transition-colors"
                        >
                          Back to Sign In
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {authView === 'reset-password' && (
                <div className="w-full space-y-6">
                  <div className="text-center">
                    <h2 className="font-display text-3xl italic font-bold mb-2">Reset Password</h2>
                    <p className="text-black/40">Enter your new password below.</p>
                  </div>

                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-black/40 ml-4">New Password</label>
                      <div className="relative">
                        <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" />
                        <input 
                          required
                          type="password" 
                          value={setupPassword}
                          onChange={(e) => setSetupPassword(e.target.value)}
                          className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl outline-none focus:ring-2 ring-black/10 card-shadow"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-black/40 ml-4">Confirm New Password</label>
                      <div className="relative">
                        <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" />
                        <input 
                          required
                          type="password" 
                          value={setupConfirmPassword}
                          onChange={(e) => setSetupConfirmPassword(e.target.value)}
                          className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl outline-none focus:ring-2 ring-black/10 card-shadow"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-5 bg-[#1A1A1A] text-white rounded-full font-bold shadow-xl mt-4 flex items-center justify-center gap-2"
                    >
                      Reset Password <ArrowRight size={20} />
                    </button>
                  </form>
                </div>
              )}
            </motion.div>
          )}

          {view === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6 space-y-6"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-black/5 border border-black/5">
                  {user?.photo ? <img src={user.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-black/20">{user?.name[0]}</div>}
                </div>
                <div>
                  <p className="text-xs text-black/40 font-medium">Welcome back,</p>
                  <h2 className="font-display text-xl italic font-bold leading-none">{user?.name?.split(' ')[0] || 'User'}</h2>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-3xl card-shadow border border-black/5">
                  <p className="text-xs uppercase tracking-wider text-black/40 font-semibold mb-1">Total Items</p>
                  <p className="text-3xl font-display italic font-bold">{stats?.totalItems || 0}</p>
                </div>
                <div className="bg-[#1A1A1A] p-4 rounded-3xl shadow-lg text-white">
                  <p className="text-xs uppercase tracking-wider text-white/40 font-semibold mb-1">Est. Profit</p>
                  <p className="text-3xl font-display italic font-bold">${stats?.totalProfit?.toFixed(0) || 0}</p>
                </div>
              </div>

              {/* Brand Summary */}
              {stats && stats.brandSummary.length > 0 && (
                <div className="bg-white p-6 rounded-3xl card-shadow border border-black/5">
                  <h3 className="font-display text-lg italic font-bold mb-4">Top Brands</h3>
                  <div className="space-y-4">
                    {stats.brandSummary.slice(0, 3).map((b, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center text-xs font-bold">
                            {i + 1}
                          </div>
                          <span className="font-medium">{b.brand}</span>
                        </div>
                        <span className="text-sm font-mono text-black/60">${b.profit.toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-display text-lg italic font-bold">Recent Flips</h3>
                  <div className="flex gap-3">
                    <button onClick={() => setView('inventory')} className="text-xs uppercase tracking-widest font-bold text-black/40 hover:text-black">View All</button>
                  </div>
                </div>
                <div className="space-y-3">
                  {inventory.length > 0 ? inventory.slice(0, 3).map((item) => (
                    <button 
                      key={item.id} 
                      onClick={() => handlePost(item)}
                      className="w-full bg-white p-3 rounded-2xl flex gap-4 items-center card-shadow border border-black/5 hover:bg-black/5 transition-colors text-left"
                    >
                      <img src={item.photo} alt={item.name} className="w-16 h-16 rounded-xl object-cover" referrerPolicy="no-referrer" />
                      <div className="flex-1">
                        <h4 className="font-bold text-sm leading-tight">{item.brand} {item.name}</h4>
                        <p className="text-xs text-black/40">{item.condition} • {item.marketplace}</p>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <div>
                          <p className="text-sm font-bold text-emerald-600">
                            {item.status === 'Sold' ? `+$${(item.actualProfit || 0).toFixed(0)}` : `+$${(item.estimatedProfit || 0).toFixed(0)}`}
                          </p>
                          <p className="text-[10px] uppercase tracking-tighter text-black/30">
                            {item.status === 'Sold' ? 'Final Profit' : 'Est. Profit'}
                          </p>
                        </div>
                        <ChevronRight size={16} className="text-black/10" />
                      </div>
                    </button>
                  )) : (
                    <div className="p-8 text-center bg-white rounded-3xl border border-dashed border-black/10">
                      <p className="text-sm text-black/30">No items yet. Start by taking a photo!</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'profile' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6 space-y-6"
            >
              <div className="flex flex-col items-center text-center pt-4">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-black/5 border-4 border-white shadow-xl mb-4">
                  {user?.photo ? <img src={user.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-3xl text-black/20">{user?.name[0]}</div>}
                </div>
                <h2 className="font-display text-2xl italic font-bold">{user?.name}</h2>
                <p className="text-black/40 text-sm mb-6">{user?.email}</p>
                
                <div className="grid grid-cols-2 gap-4 w-full">
                  <div className="bg-white p-4 rounded-3xl card-shadow border border-black/5">
                    <p className="text-[10px] uppercase font-bold text-black/40 mb-1">Total Items</p>
                    <p className="text-2xl font-display italic font-bold">{stats?.totalItems || 0}</p>
                  </div>
                  <div className="bg-white p-4 rounded-3xl card-shadow border border-black/5">
                    <p className="text-[10px] uppercase font-bold text-black/40 mb-1">Total Profit</p>
                    <p className="text-2xl font-display italic font-bold text-emerald-600">${stats?.totalProfit?.toFixed(0) || 0}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={() => setView('plans')}
                  className="w-full p-4 bg-white rounded-2xl flex items-center justify-between card-shadow border border-black/5"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><Shield size={18} /></div>
                    <div className="text-left">
                      <p className="font-bold text-sm">Subscription Plan</p>
                      <p className="text-[10px] text-black/40 uppercase font-bold">{user?.subscriptionTier || 'Free'} Plan • {user?.lookupCount || 0}/{user?.maxLookups || 10} Lookups</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-black/20" />
                </button>
                <button 
                  onClick={() => setView('inventory')}
                  className="w-full p-4 bg-white rounded-2xl flex items-center justify-between card-shadow border border-black/5"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-black/5 rounded-lg text-black/60"><Package size={18} /></div>
                    <span className="font-bold text-sm">My Inventory</span>
                  </div>
                  <ChevronRight size={18} className="text-black/20" />
                </button>
                <button 
                  onClick={handleLogoutUI}
                  className="w-full p-4 bg-rose-50 rounded-2xl flex items-center justify-between border border-rose-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-100 rounded-lg text-rose-600"><LogOut size={18} /></div>
                    <span className="font-bold text-sm text-rose-600">Log Out</span>
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {view === 'plans' && (
            <motion.div 
              key="plans"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6 space-y-6"
            >
              <div className="flex items-center gap-4 mb-2">
                <button onClick={() => setView('profile')} className="p-2 bg-white rounded-full card-shadow">
                  <X size={18} className="text-black/40" />
                </button>
                <h2 className="font-display text-2xl italic font-bold">Choose Your Plan</h2>
              </div>

              <div className="space-y-4">
                {/* Free Plan */}
                <div className={`p-6 rounded-[32px] border-2 transition-all ${user?.subscriptionTier === 'Free' ? 'bg-white border-black shadow-xl' : 'bg-white/50 border-black/5'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg">Free Starter</h3>
                      <p className="text-xs text-black/40">Perfect for trying it out</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-display italic font-bold">$0</p>
                      <p className="text-[10px] font-bold text-black/30">FOREVER</p>
                    </div>
                  </div>
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-center gap-2 text-xs font-medium"><Check size={14} className="text-emerald-500" /> 10 AI Item Lookups</li>
                    <li className="flex items-center gap-2 text-xs font-medium"><Check size={14} className="text-emerald-500" /> Suggestive Pricing</li>
                    <li className="flex items-center gap-2 text-xs font-medium opacity-30"><X size={14} /> Multi-Marketplace Posting</li>
                    <li className="flex items-center gap-2 text-xs font-medium opacity-30"><X size={14} /> Mileage Tracker</li>
                  </ul>
                  <button 
                    disabled={user?.subscriptionTier === 'Free'}
                    onClick={() => updateSubscription('Free')}
                    className={`w-full py-3 rounded-2xl font-bold text-sm transition-all ${user?.subscriptionTier === 'Free' ? 'bg-black/5 text-black/40 cursor-default' : 'bg-black text-white hover:bg-black/80'}`}
                  >
                    {user?.subscriptionTier === 'Free' ? 'Current Plan' : 'Select Plan'}
                  </button>
                </div>

                {/* Pro Plan */}
                <div className={`p-6 rounded-[32px] border-2 transition-all relative overflow-hidden ${user?.subscriptionTier === 'Pro' ? 'bg-white border-blue-500 shadow-xl' : 'bg-white/50 border-black/5'}`}>
                  <div className="absolute top-0 right-0 bg-blue-500 text-white px-4 py-1 rounded-bl-2xl text-[10px] font-bold uppercase tracking-wider">Popular</div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg flex items-center gap-2">Pro Seller <Zap size={16} className="text-blue-500" /></h3>
                      <p className="text-xs text-black/40">For growing resellers</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-display italic font-bold">$10</p>
                      <p className="text-[10px] font-bold text-black/30">PER MONTH</p>
                    </div>
                  </div>
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-center gap-2 text-xs font-medium"><Check size={14} className="text-emerald-500" /> 100 AI Item Lookups</li>
                    <li className="flex items-center gap-2 text-xs font-medium"><Check size={14} className="text-emerald-500" /> Suggestive Pricing</li>
                    <li className="flex items-center gap-2 text-xs font-medium"><Check size={14} className="text-emerald-500" /> 1 Marketplace Posting</li>
                    <li className="flex items-center gap-2 text-xs font-medium opacity-30"><X size={14} /> Mileage Tracker</li>
                  </ul>
                  <button 
                    disabled={user?.subscriptionTier === 'Pro' || isSavingSubscription}
                    onClick={() => updateSubscription('Pro')}
                    className={`w-full py-3 rounded-2xl font-bold text-sm transition-all ${user?.subscriptionTier === 'Pro' ? 'bg-blue-50 text-blue-500 cursor-default' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                  >
                    {isSavingSubscription ? <Loader2 className="animate-spin mx-auto" size={18} /> : (user?.subscriptionTier === 'Pro' ? 'Current Plan' : 'Upgrade to Pro')}
                  </button>
                </div>

                {/* Unlimited Plan */}
                <div className={`p-6 rounded-[32px] border-2 transition-all relative overflow-hidden ${user?.subscriptionTier === 'Unlimited' ? 'bg-white border-amber-500 shadow-xl' : 'bg-white/50 border-black/5'}`}>
                  <div className="absolute top-0 right-0 bg-amber-500 text-white px-4 py-1 rounded-bl-2xl text-[10px] font-bold uppercase tracking-wider">Best Value</div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg flex items-center gap-2">Unlimited <Star size={16} className="text-amber-500" /></h3>
                      <p className="text-xs text-black/40">The ultimate toolkit</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-display italic font-bold">$25</p>
                      <p className="text-[10px] font-bold text-black/30">PER MONTH</p>
                    </div>
                  </div>
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-center gap-2 text-xs font-medium"><Check size={14} className="text-emerald-500" /> Unlimited AI Lookups</li>
                    <li className="flex items-center gap-2 text-xs font-medium"><Check size={14} className="text-emerald-500" /> 4+ Marketplace Posting</li>
                    <li className="flex items-center gap-2 text-xs font-medium"><Check size={14} className="text-emerald-500" /> Quick Removal (Cross-list)</li>
                    <li className="flex items-center gap-2 text-xs font-medium"><Check size={14} className="text-emerald-500" /> Full Mileage Tracker</li>
                  </ul>
                  <button 
                    disabled={user?.subscriptionTier === 'Unlimited' || isSavingSubscription}
                    onClick={() => updateSubscription('Unlimited')}
                    className={`w-full py-3 rounded-2xl font-bold text-sm transition-all ${user?.subscriptionTier === 'Unlimited' ? 'bg-amber-50 text-amber-600 cursor-default' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
                  >
                    {isSavingSubscription ? <Loader2 className="animate-spin mx-auto" size={18} /> : (user?.subscriptionTier === 'Unlimited' ? 'Current Plan' : 'Get Unlimited')}
                  </button>
                </div>
              </div>

              <p className="text-center text-[10px] text-black/30 px-8">
                Payments are processed securely via Stripe. You can cancel your subscription at any time from your account settings.
              </p>
            </motion.div>
          )}

          {view === 'capture' && (
            <motion.div 
              key="capture"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-6 space-y-6"
            >
              <div className="relative aspect-[3/4] rounded-[40px] overflow-hidden bg-black shadow-2xl">
                {photo && <img src={photo} alt="Preview" className="w-full h-full object-cover" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-8">
                  <h2 className="text-white font-display text-3xl italic font-bold mb-2">Photo Captured</h2>
                  <p className="text-white/70 text-sm">Tap "Analyze Item" below to find the resale price, demand, and create a professional listing.</p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleRemoveBackground}
                  disabled={isRemovingBackground || isAnalyzing}
                  className="w-full py-4 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center gap-2 border border-blue-100 disabled:opacity-50"
                >
                  {isRemovingBackground ? <Loader2 className="animate-spin" size={20} /> : <ImageIcon size={20} />}
                  {isRemovingBackground ? 'Removing Background...' : 'Remove Background'}
                </button>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setPhoto(null) || setView('dashboard')}
                    className="flex-1 py-4 rounded-full border-2 border-black/10 font-bold flex items-center justify-center gap-2"
                  >
                    <X size={20} /> Retake
                  </button>
                  <button 
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || isRemovingBackground}
                    className="flex-[2] py-4 rounded-full bg-[#1A1A1A] text-white font-bold flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
                  >
                    {isAnalyzing ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                    {isAnalyzing ? 'Analyzing...' : 'Analyze Item'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'analysis' && analysisResult && (
            <motion.div 
              key="analysis"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 space-y-6"
            >
              <div className="flex items-center gap-4 mb-2">
                <button onClick={() => setView('capture')} className="p-2 rounded-full bg-black/5"><X size={18} /></button>
                <h2 className="font-display text-xl italic font-bold">Analysis Result</h2>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded-2xl border border-black/5 text-center">
                  <p className="text-[10px] uppercase text-black/40 font-bold">Resale</p>
                  <p className="font-display italic font-bold text-lg">${analysisResult.estimatedResalePrice}</p>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-black/5 text-center">
                  <p className="text-[10px] uppercase text-black/40 font-bold">STR</p>
                  <p className="font-display italic font-bold text-lg text-emerald-600">{analysisResult.sellThroughRate}</p>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-black/5 text-center">
                  <p className="text-[10px] uppercase text-black/40 font-bold">Fees</p>
                  <p className="font-display italic font-bold text-lg text-rose-500">15%</p>
                </div>
              </div>

              {/* Form */}
              <div className="bg-white p-6 rounded-3xl card-shadow border border-black/5 space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-black/40 block mb-1">Item Details</label>
                  <p className="font-bold text-lg">{analysisResult.brand} {analysisResult.itemName}</p>
                  <p className="text-sm text-black/60">{analysisResult.type} • {analysisResult.condition}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-black/5">
                  <button 
                    onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(analysisResult.brand + ' ' + analysisResult.itemName + ' resale price')}`, '_blank')}
                    className="flex items-center justify-center gap-2 py-3 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors"
                  >
                    <Search size={14} /> Search Price
                  </button>
                  <button 
                    onClick={() => window.open(`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(analysisResult.brand + ' ' + analysisResult.itemName + ' sold')}&LH_Sold=1&LH_Complete=1`, '_blank')}
                    className="flex items-center justify-center gap-2 py-3 bg-amber-50 text-amber-600 rounded-xl text-xs font-bold hover:bg-amber-100 transition-colors"
                  >
                    <TrendingUp size={14} /> Check Demand
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-black/5">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-black/40 block mb-2">Purchase Price</label>
                    <div className="relative">
                      <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" />
                      <input 
                        type="number" 
                        step="0.01"
                        value={purchasePrice}
                        onChange={(e) => setPurchasePrice(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-black/5 rounded-xl font-mono text-lg outline-none focus:ring-2 ring-black/10"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-black/40 block mb-2">Target Sale Price</label>
                    <div className="relative">
                      <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" />
                      <input 
                        type="number" 
                        step="0.01"
                        value={targetSalePrice}
                        onChange={(e) => setTargetSalePrice(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-black/5 rounded-xl font-mono text-lg outline-none focus:ring-2 ring-black/10"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-black/40 block mb-2">Select Marketplace (to list on later)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['eBay', 'Poshmark', 'Mercari', 'Facebook Marketplace'].map((m) => (
                      <button 
                        key={m}
                        onClick={() => setSelectedMarketplace(m as any)}
                        className={`py-2 rounded-xl text-xs font-bold transition-all ${selectedMarketplace === m ? 'bg-[#1A1A1A] text-white' : 'bg-black/5 text-black/60'}`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Listing Preview */}
              <div className="bg-white p-6 rounded-3xl card-shadow border border-black/5 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-display text-lg italic font-bold">Listing Preview</h3>
                  <button onClick={() => copyToClipboard(`${analysisResult.suggestedTitle}\n\n${analysisResult.suggestedDescription}`)} className="p-2 rounded-full hover:bg-black/5 text-black/40"><Copy size={16} /></button>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-[10px] uppercase font-bold text-blue-600 mb-1">How to list</p>
                  <p className="text-[11px] text-blue-800 leading-tight">
                    Click <b>List Now</b> to open {selectedMarketplace}. We'll copy the title and description to your clipboard so you can just paste them in!
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-black/5 rounded-xl">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-[10px] uppercase font-bold text-black/40">Title</p>
                      <button onClick={() => copyToClipboard(analysisResult.suggestedTitle)} className="text-[10px] font-bold text-blue-600 flex items-center gap-1">
                        <Copy size={12} /> Copy
                      </button>
                    </div>
                    <p className="text-sm font-bold">{analysisResult.suggestedTitle}</p>
                  </div>
                  <div className="p-3 bg-black/5 rounded-xl">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-[10px] uppercase font-bold text-black/40">Description</p>
                      <button onClick={() => copyToClipboard(analysisResult.suggestedDescription)} className="text-[10px] font-bold text-blue-600 flex items-center gap-1">
                        <Copy size={12} /> Copy
                      </button>
                    </div>
                    <p className="text-xs text-black/60 leading-relaxed">{analysisResult.suggestedDescription}</p>
                  </div>
                  <div className="p-3 bg-black/5 rounded-xl">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-[10px] uppercase font-bold text-black/40">Suggested Price</p>
                      <button onClick={() => copyToClipboard(targetSalePrice || analysisResult.estimatedResalePrice.toString())} className="text-[10px] font-bold text-blue-600 flex items-center gap-1">
                        <Copy size={12} /> Copy
                      </button>
                    </div>
                    <p className="text-sm font-bold text-emerald-600">${targetSalePrice || analysisResult.estimatedResalePrice}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-[2] py-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center gap-2 shadow-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={20} /> Save to Inventory
                    </>
                  )}
                </button>
                <button 
                  onClick={() => {
                    handlePost({
                      id: 'temp', // Temporary ID for preview
                      name: analysisResult.itemName || analysisResult.suggestedTitle,
                      description: analysisResult.suggestedDescription,
                      averageResalePrice: targetSalePrice ? parseFloat(targetSalePrice) : analysisResult.estimatedResalePrice,
                      marketplace: selectedMarketplace,
                      photo: photo || ''
                    });
                  }}
                  className="flex-1 py-5 rounded-full bg-[#1A1A1A] text-white font-bold flex items-center justify-center gap-2 shadow-xl hover:bg-black transition-colors"
                >
                  <ArrowRight size={20} /> List Now
                </button>
              </div>
            </motion.div>
          )}

          {view === 'inventory' && (
            <motion.div 
              key="inventory"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6 space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="font-display text-2xl italic font-bold">Inventory</h2>
                <div className="flex gap-2">
                  <div className="p-2 bg-white rounded-full card-shadow"><Search size={18} className="text-black/40" /></div>
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {['All', 'Available', 'Sold'].map((f) => (
                  <button 
                    key={f}
                    onClick={() => setInventoryFilter(f as any)}
                    className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${inventoryFilter === f ? 'bg-[#1A1A1A] text-white' : 'bg-white text-black/40 border border-black/5'}`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                {inventory.length > 0 ? inventory
                  .filter(item => {
                    if (inventoryFilter === 'Available') return item.status !== 'Sold';
                    if (inventoryFilter === 'Sold') return item.status === 'Sold';
                    return true;
                  })
                  .map((item) => (
                  <div key={item.id} className="bg-white rounded-[32px] overflow-hidden card-shadow border border-black/5 group">
                    <div className="relative h-48">
                      <img src={item.photo} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                        <div className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm">
                          {item.marketplace}
                        </div>
                        {item.status && (
                          <select 
                            value={item.status}
                            onChange={(e) => updateItemStatus(item.id!, e.target.value as any)}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm outline-none border-none cursor-pointer appearance-none ${
                              item.status === 'Ready to Post' ? 'bg-blue-500 text-white' : 
                              item.status === 'Posted' ? 'bg-emerald-500 text-white' :
                              item.status === 'Sold' ? 'bg-amber-500 text-white' : 'bg-black/40 text-white'
                            }`}
                          >
                            <option value="Draft">Draft</option>
                            <option value="Ready to Post">Ready to Post</option>
                            <option value="Posted">Posted</option>
                            <option value="Sold">Sold</option>
                          </select>
                        )}
                      </div>
                      <div className="absolute bottom-4 left-4 bg-[#1A1A1A] text-white px-4 py-2 rounded-2xl flex items-center gap-2 shadow-lg">
                        <TrendingUp size={14} className={item.status === 'Sold' ? "text-amber-400" : "text-emerald-400"} />
                        <span className="font-bold text-sm">
                          ${item.status === 'Sold' ? (item.actualProfit || 0).toFixed(0) : (item.estimatedProfit || 0).toFixed(0)} 
                          {item.status === 'Sold' ? ' Final Profit' : ' Est. Profit'}
                        </span>
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-lg leading-tight">{item.brand} {item.name}</h4>
                          <p className="text-xs text-black/40">{item.condition} • {item.type}</p>
                        </div>
                        <button 
                          onClick={() => handlePost(item)}
                          className="p-2 rounded-full hover:bg-black/5 transition-colors"
                        >
                          <ChevronRight size={20} className="text-black/20" />
                        </button>
                      </div>
                      <div className="flex gap-4 pt-4 border-t border-black/5 items-center">
                        <div className="flex-1">
                          <p className="text-[10px] uppercase font-bold text-black/30">Cost</p>
                          <p className="font-mono font-bold">${item.purchasePrice}</p>
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] uppercase font-bold text-black/30">Target</p>
                          <p className="font-mono font-bold">${item.averageResalePrice}</p>
                        </div>
                        <div className="flex-[2] flex gap-2">
                          <button 
                            onClick={() => handlePost(item)}
                            className="flex-1 py-2 bg-[#1A1A1A] text-white rounded-xl text-xs font-bold hover:bg-black transition-colors flex items-center justify-center gap-2"
                          >
                            <ArrowRight size={14} /> 
                            {item.status === 'Draft' || item.status === 'Ready to Post' ? 'Post Now' : 
                             item.status === 'Sold' ? 'Sell Again' : 'Re-Post'}
                          </button>
                          {item.status !== 'Sold' && (
                            <button 
                              onClick={() => {
                                setItemToMarkAsSold(item);
                                setView('mark-as-sold');
                              }}
                              className="flex-1 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
                            >
                              <DollarSign size={14} /> Sold
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="p-12 text-center bg-white rounded-[40px] border border-dashed border-black/10">
                    <Package size={48} className="mx-auto text-black/10 mb-4" />
                    <p className="text-black/40 font-medium">Your inventory is empty.</p>
                    <button onClick={() => fileInputRef.current?.click()} className="mt-4 text-sm font-bold text-[#1A1A1A] underline">Add your first item</button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
          {view === 'users' && (
            <motion.div 
              key="users"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="font-display text-2xl italic font-bold">User Profiles</h2>
              </div>

              <div className="space-y-4">
                {allUsers.length > 0 ? allUsers.map((u) => (
                  <div key={u.email} className="bg-white p-4 rounded-[32px] card-shadow border border-black/5 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden bg-black/5 border border-black/5 flex-shrink-0">
                      {u.photo ? <img src={u.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-black/20 text-xl">{u.name[0]}</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-sm truncate">{u.name}</h4>
                          <p className="text-[10px] text-black/40 truncate mb-2">{u.email}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${
                            u.subscriptionTier === 'Unlimited' ? 'bg-emerald-500 text-white' : 
                            u.subscriptionTier === 'Pro' ? 'bg-blue-500 text-white' : 'bg-black/10 text-black/40'
                          }`}>
                            {u.subscriptionTier}
                          </span>
                          <div className="flex gap-1">
                            {['Free', 'Pro', 'Unlimited', 'Admin'].map((tier) => (
                              tier !== u.subscriptionTier && (
                                <button
                                  key={tier}
                                  disabled={isUpdatingUser === u.id}
                                  onClick={() => handleUpdateUserTier(u.id, tier as any)}
                                  className="text-[8px] font-bold text-black/40 hover:text-black underline"
                                >
                                  {tier}
                                </button>
                              )
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex items-center gap-1">
                          <Package size={10} className="text-black/20" />
                          <span className="text-[10px] font-bold">{u.itemCount || 0} Items</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp size={10} className="text-emerald-500" />
                          <span className="text-[10px] font-bold text-emerald-600">${(u.totalProfit || 0).toFixed(0)} Profit</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="p-12 text-center bg-white rounded-[40px] border border-dashed border-black/10">
                    <UserIcon size={48} className="mx-auto text-black/10 mb-4" />
                    <p className="text-black/40 font-medium">No users found.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {view === 'tracker' && user?.subscriptionTier === 'Unlimited' && (
            <motion.div 
              key="tracker"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="font-display text-2xl italic font-bold">Sales & Profit Tracker</h2>
              </div>

              {/* Summary Dashboard */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-[32px] card-shadow border border-black/5">
                  <p className="text-[10px] uppercase font-bold text-black/30 mb-1">Total Items</p>
                  <p className="text-2xl font-display italic font-bold">{stats?.totalItems || 0}</p>
                </div>
                <div className="bg-white p-4 rounded-[32px] card-shadow border border-black/5">
                  <p className="text-[10px] uppercase font-bold text-black/30 mb-1">Total Listed</p>
                  <p className="text-2xl font-display italic font-bold text-blue-600">{stats?.totalListed || 0}</p>
                </div>
                <div className="bg-white p-4 rounded-[32px] card-shadow border border-black/5">
                  <p className="text-[10px] uppercase font-bold text-black/30 mb-1">Total Sold</p>
                  <p className="text-2xl font-display italic font-bold text-amber-500">{stats?.totalSold || 0}</p>
                </div>
                <div className="bg-white p-4 rounded-[32px] card-shadow border border-black/5">
                  <p className="text-[10px] uppercase font-bold text-black/30 mb-1">Avg Profit/Item</p>
                  <p className="text-2xl font-display italic font-bold text-emerald-600">
                    ${stats && stats.totalItems > 0 ? (stats.totalProfit / stats.totalItems).toFixed(0) : 0}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-[32px] card-shadow border border-black/5">
                  <p className="text-[10px] uppercase font-bold text-black/30 mb-1">YTD Mileage</p>
                  <p className="text-2xl font-display italic font-bold text-emerald-600">{stats?.totalMilesYTD?.toFixed(1) || 0} mi</p>
                </div>
                <div className="col-span-2 md:col-span-1 bg-[#1A1A1A] p-6 rounded-[32px] shadow-xl text-white">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-xs uppercase font-bold opacity-50">Total Profit</p>
                    <TrendingUp size={20} className="text-emerald-400" />
                  </div>
                  <p className="text-4xl font-display italic font-bold">${stats?.totalProfit?.toFixed(0) || 0}</p>
                </div>
              </div>

              {/* Mileage Tracker Widget */}
              <div className="bg-white p-6 rounded-[32px] card-shadow border border-black/5 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                      <MapIcon size={20} />
                    </div>
                    <h3 className="font-bold text-lg">Mileage Tracker</h3>
                  </div>
                  {isTracking && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500 text-white rounded-full text-[10px] font-bold animate-pulse">
                      <div className="w-2 h-2 bg-white rounded-full" />
                      TRACKING
                    </div>
                  )}
                </div>

                {isTracking ? (
                  <div className="space-y-4">
                    <div className="bg-black/5 p-4 rounded-2xl text-center">
                      <p className="text-[10px] uppercase font-bold text-black/30 mb-1">Current Trip Distance</p>
                      <p className="text-4xl font-display italic font-bold text-emerald-600">{currentMiles.toFixed(2)} mi</p>
                      <p className="text-xs text-black/40 mt-1 flex items-center justify-center gap-1">
                        <MapPin size={12} /> {activeTrip?.startLocation}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-black/30 px-2">Trip Notes (Optional)</label>
                      <textarea 
                        value={tripNotes}
                        onChange={(e) => setTripNotes(e.target.value)}
                        placeholder="e.g. Post office run, sourcing trip..."
                        className="w-full bg-black/5 border-none rounded-2xl p-3 text-sm outline-none focus:ring-2 ring-emerald-500 transition-all h-20 resize-none"
                      />
                    </div>

                    <button 
                      onClick={stopTrip}
                      disabled={isSavingTrip}
                      className="w-full py-4 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 disabled:opacity-50"
                    >
                      {isSavingTrip ? <Loader2 className="animate-spin" size={18} /> : <Square size={18} fill="currentColor" />} 
                      Stop & Log Trip
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-black/5 p-6 rounded-2xl text-center border border-dashed border-black/10">
                      <Navigation size={32} className="mx-auto text-black/10 mb-2" />
                      <p className="text-sm text-black/40">Ready for your next trip?</p>
                    </div>
                    <button 
                      onClick={startTrip}
                      className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                    >
                      <Play size={18} fill="currentColor" /> Start New Trip
                    </button>
                  </div>
                )}

                {/* Recent Trips History */}
                {trips.length > 0 && (
                  <div className="pt-4 border-t border-black/5">
                    <div className="flex justify-between items-center mb-3 px-1">
                      <h4 className="text-xs font-bold uppercase text-black/30 flex items-center gap-1">
                        <History size={12} /> Recent Trips
                      </h4>
                    </div>
                    <div className="space-y-3">
                      {trips.slice(0, 3).map((trip) => (
                        <div key={trip.id} className="bg-black/5 p-3 rounded-2xl flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
                            <MapPin size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <p className="text-xs font-bold truncate">{trip.startLocation} → {trip.endLocation}</p>
                              <p className="text-xs font-bold text-emerald-600 ml-2">{trip.miles}mi</p>
                            </div>
                            <p className="text-[10px] text-black/30 font-mono">{new Date(trip.date).toLocaleDateString()} {trip.notes ? `• ${trip.notes}` : ''}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Recent Items List */}
              <div className="space-y-4">
                <h3 className="font-bold text-lg px-2">Recent Activity</h3>
                {inventory.length > 0 ? inventory.slice(0, 10).map((item) => (
                  <button 
                    key={item.id} 
                    onClick={() => handlePost(item)}
                    className="w-full bg-white p-4 rounded-[24px] card-shadow border border-black/5 flex items-center gap-4 hover:bg-black/5 transition-colors text-left"
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/5 flex-shrink-0">
                      <img src={item.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm truncate">{item.brand} {item.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${
                          item.status === 'Ready to Post' ? 'bg-blue-500 text-white' : 
                          item.status === 'Posted' ? 'bg-emerald-500 text-white' :
                          item.status === 'Sold' ? 'bg-amber-500 text-white' : 'bg-black/10 text-black/40'
                        }`}>
                          {item.status}
                        </span>
                        <span className="text-[10px] text-black/30 font-mono">
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Just now'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className="text-xs font-bold text-emerald-600">
                          {item.status === 'Sold' ? `+$${(item.actualProfit || 0).toFixed(0)}` : `+$${(item.estimatedProfit || 0).toFixed(0)}`}
                        </p>
                        <p className="text-[10px] text-black/30 font-mono">
                          {item.status === 'Sold' ? `$${(item.soldPrice || 0).toFixed(0)}` : `$${(item.averageResalePrice || 0).toFixed(0)}`}
                        </p>
                      </div>
                      {item.status !== 'Sold' ? (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setItemToMarkAsSold(item);
                            setView('mark-as-sold');
                          }}
                          className="p-2 bg-amber-500 text-white rounded-full hover:bg-amber-600 transition-colors shadow-sm"
                          title="Mark as Sold"
                        >
                          <DollarSign size={16} />
                        </button>
                      ) : (
                        <ChevronRight size={16} className="text-black/10" />
                      )}
                    </div>
                  </button>
                )) : (
                  <div className="p-8 text-center bg-white rounded-[32px] border border-dashed border-black/10">
                    <p className="text-black/40 text-sm">No activity yet.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
          {view === 'mark-as-sold' && itemToMarkAsSold && (
            <motion.div 
              key="mark-as-sold"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="p-6 space-y-6"
            >
              <div className="flex items-center gap-4 mb-2">
                <button onClick={() => setView('inventory')} className="p-2 rounded-full bg-black/5"><X size={18} /></button>
                <h2 className="font-display text-xl italic font-bold">Mark as Sold</h2>
              </div>

              <div className="bg-white p-6 rounded-[32px] card-shadow border border-black/5 flex items-center gap-4">
                <img src={itemToMarkAsSold.photo} className="w-16 h-16 rounded-2xl object-cover" referrerPolicy="no-referrer" />
                <div>
                  <h3 className="font-bold text-sm">{itemToMarkAsSold.brand} {itemToMarkAsSold.name}</h3>
                  <p className="text-[10px] text-black/40 uppercase font-bold">Bought for ${itemToMarkAsSold.purchasePrice}</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[40px] card-shadow border border-black/5 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-black/40 block mb-2 px-1">Sold Price</label>
                    <div className="relative">
                      <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30" />
                      <input 
                        type="number" 
                        step="0.01"
                        value={soldPrice}
                        onChange={(e) => setSoldPrice(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 bg-black/5 rounded-2xl font-mono text-xl outline-none focus:ring-2 ring-black/10"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-black/40 block mb-2 px-1">Marketplace Sold On</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['eBay', 'Poshmark', 'Mercari', 'Facebook Marketplace'].map((m) => (
                        <button 
                          key={m}
                          onClick={() => setMarketplaceSoldOn(m as any)}
                          className={`py-3 rounded-xl text-xs font-bold border transition-all ${marketplaceSoldOn === m ? 'bg-[#1A1A1A] text-white border-black' : 'bg-white text-black/40 border-black/5 hover:border-black/20'}`}
                        >
                          {m === 'Facebook Marketplace' ? 'FB Marketplace' : m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-black/40 block mb-2 px-1">Shipping Cost</label>
                      <div className="relative">
                        <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30" />
                        <input 
                          type="number" 
                          step="0.01"
                          value={shippingCost}
                          onChange={(e) => setShippingCost(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-black/5 rounded-xl font-mono text-lg outline-none focus:ring-2 ring-black/10"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-black/40 block mb-2 px-1">Marketplace Fee</label>
                      <div className="relative">
                        <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30" />
                        <input 
                          type="number" 
                          step="0.01"
                          value={marketplaceFee}
                          onChange={(e) => setMarketplaceFee(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-black/5 rounded-xl font-mono text-lg outline-none focus:ring-2 ring-black/10"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-black/5">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-sm font-bold text-black/40">Estimated Final Profit</p>
                    <p className="text-2xl font-display italic font-bold text-emerald-600">
                      ${(parseFloat(soldPrice || '0') - itemToMarkAsSold.purchasePrice - parseFloat(shippingCost || '0') - parseFloat(marketplaceFee || '0')).toFixed(2)}
                    </p>
                  </div>
                  
                  <button 
                    onClick={handleMarkAsSold}
                    disabled={isSaving || !soldPrice}
                    className="w-full py-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center gap-2 shadow-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                    Confirm Sale
                  </button>
                </div>
              </div>
            </motion.div>
          )}
          {view === 'listing-package' && listingItem && (
            <motion.div 
              key="listing-package"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-6 space-y-6"
            >
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => setView('inventory')} className="p-2 hover:bg-black/5 rounded-full">
                  <X size={20} />
                </button>
                <h2 className="font-display text-2xl italic font-bold">Listing Package</h2>
              </div>

              <div className="bg-white rounded-[32px] overflow-hidden card-shadow border border-black/5">
                <div className="relative h-64 bg-black/5">
                  <img src={listingItem.photo || listingItem.image} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  <button 
                    onClick={() => downloadImage(listingItem.photo || listingItem.image, `listing-${listingItem.name}.png`)}
                    className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-full shadow-lg flex items-center gap-2 text-xs font-bold hover:bg-white transition-colors"
                  >
                    <Download size={16} /> Download Image
                  </button>
                </div>
                
                <div className="p-6 space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] uppercase font-bold text-black/40">Title</label>
                      <button onClick={() => copyToClipboard(listingItem.name)} className="text-[10px] font-bold text-blue-600 flex items-center gap-1">
                        <Copy size={12} /> Copy
                      </button>
                    </div>
                    <p className="text-sm font-bold leading-tight">{listingItem.name}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] uppercase font-bold text-black/40">Description</label>
                      <button onClick={() => copyToClipboard(listingItem.description)} className="text-[10px] font-bold text-blue-600 flex items-center gap-1">
                        <Copy size={12} /> Copy
                      </button>
                    </div>
                    <p className="text-xs text-black/60 leading-relaxed whitespace-pre-wrap">{listingItem.description}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] uppercase font-bold text-black/40">Suggested Price</label>
                      <button onClick={() => copyToClipboard(listingItem.averageResalePrice.toString())} className="text-[10px] font-bold text-blue-600 flex items-center gap-1">
                        <Copy size={12} /> Copy
                      </button>
                    </div>
                    <p className="text-2xl font-display italic font-bold text-emerald-600">${(listingItem?.averageResalePrice || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] uppercase font-bold text-black/40 text-center">Post to Marketplace</p>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => openMarketplace(listingItem, 'eBay')}
                    className="py-4 bg-white rounded-2xl border border-black/5 card-shadow font-bold text-sm flex items-center justify-center gap-2 hover:bg-black/5 transition-colors"
                  >
                    Post to eBay
                  </button>
                  <button 
                    onClick={() => openMarketplace(listingItem, 'Poshmark')}
                    className="py-4 bg-white rounded-2xl border border-black/5 card-shadow font-bold text-sm flex items-center justify-center gap-2 hover:bg-black/5 transition-colors"
                  >
                    Post to Poshmark
                  </button>
                  <button 
                    onClick={() => openMarketplace(listingItem, 'Mercari')}
                    className="py-4 bg-white rounded-2xl border border-black/5 card-shadow font-bold text-sm flex items-center justify-center gap-2 hover:bg-black/5 transition-colors"
                  >
                    Post to Mercari
                  </button>
                  <button 
                    onClick={() => openMarketplace(listingItem, 'Facebook Marketplace')}
                    className="py-4 bg-white rounded-2xl border border-black/5 card-shadow font-bold text-sm flex items-center justify-center gap-2 hover:bg-black/5 transition-colors"
                  >
                    Post to FB
                  </button>
                </div>
              </div>
            </motion.div>
          )}
          {showDelistPanel && delistItem && (
            <motion.div 
              key="delist-panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-[#F5F5F0] w-full max-w-md rounded-[40px] overflow-hidden shadow-2xl"
              >
                <div className="p-8 space-y-6">
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Check size={32} />
                    </div>
                    <h2 className="font-display text-2xl italic font-bold">Sale Recorded!</h2>
                    <p className="text-black/40 text-sm">Now, remove this listing from other marketplaces to prevent double selling.</p>
                  </div>

                  <div className="bg-white p-4 rounded-3xl border border-black/5 flex items-center gap-4">
                    <img src={delistItem.photo} className="w-12 h-12 rounded-xl object-cover" referrerPolicy="no-referrer" />
                    <div>
                      <h3 className="font-bold text-xs">{delistItem.brand} {delistItem.name}</h3>
                      <p className="text-[10px] text-emerald-600 font-bold uppercase">Sold on {delistItem.marketplaceSoldOn}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] uppercase font-bold text-black/40 text-center">Remove from other platforms</p>
                    <div className="grid grid-cols-1 gap-2">
                      {['eBay', 'Poshmark', 'Mercari', 'Facebook Marketplace']
                        .filter(m => m !== delistItem.marketplaceSoldOn)
                        .map((m) => (
                        <button 
                          key={m}
                          onClick={() => openMarketplace(delistItem, m as any, true)}
                          className="w-full py-4 bg-white rounded-2xl border border-black/5 card-shadow font-bold text-sm flex items-center justify-center gap-2 hover:bg-black/5 transition-colors"
                        >
                          Remove from {m === 'Facebook Marketplace' ? 'FB' : m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      setShowDelistPanel(false);
                      setDelistItem(null);
                    }}
                    className="w-full py-4 text-black/40 font-bold text-sm hover:text-black transition-colors"
                  >
                    Done for now
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <LegalModal 
          isOpen={isLegalModalOpen} 
          onClose={() => setIsLegalModalOpen(false)} 
          type={legalModalType} 
        />
      </main>

      {/* Floating Action Button */}
      {view !== 'setup' && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-20">
          <input 
            type="file" 
            accept="image/*" 
            capture="environment"
            ref={fileInputRef}
            onChange={handleCapture}
            className="hidden"
          />
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => fileInputRef.current?.click()}
            className="w-16 h-16 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center shadow-2xl border-4 border-white"
          >
            <Camera size={28} />
          </motion.button>
        </div>
      )}

      {/* Bottom Nav Blur */}
      {view !== 'setup' && (
        <div className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#F5F5F0] to-transparent pointer-events-none z-10" />
      )}
    </div>
  );
}
