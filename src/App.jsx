import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Firebase Imports (Grouped for clarity) ---
// This is the ONLY place Firebase functions should be imported.
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    signInWithCustomToken,
    signInAnonymously
} from 'firebase/auth';
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    collection, 
    onSnapshot,
    query,
    getDocs,
    deleteDoc,
    updateDoc,
    addDoc
} from 'firebase/firestore';

// --- Other Library Imports ---
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Note: xlsx and html2canvas are loaded via script tags in the App component
// to resolve build errors in this environment.

// --- Firebase Configuration ---
// IMPORTANT: Replace this with the configuration object from your Firebase project.
const firebaseConfig = {
  apiKey: "AIzaSyCD_Zq0WIHFXoHMv1MGS3NeMfrxs5Q1JLw",
  authDomain: "excel-analysis-d624a.firebaseapp.com",
  projectId: "excel-analysis-d624a",
  storageBucket: "excel-analysis-d624a.firebasestorage.app",
  messagingSenderId: "74828883154",
  appId: "1:74828883154:web:d0ce9d452add9bc226390b",
  measurementId: "G-03LF8BNR48"
};

// App ID for Firestore paths. This is a unique identifier for your app's data.
// eslint-disable-next-line no-undef
const appId = typeof __app_id !== 'undefined' ? __app_id : 'excel-analytics-platform';

// --- Icon Components (using inline SVG for portability) ---

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
);

const ChartIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="M18.7 8a6 6 0 0 0-6-6" />
        <path d="M13 13a6 6 0 0 0 6 6" />
    </svg>
);

const HistoryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M12 7v5l3.5 2" />
    </svg>
);

const AdminIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
        <path d="M15.89 15.32c-.42-.17-1.33-.6-3.89-.6s-3.47.43-3.89.6A2.4 2.4 0 0 0 7 17.5V19h10v-1.5a2.4 2.4 0 0 0-1.11-2.18z" />
    </svg>
);

const LogoutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
);

// --- UI Components ---

const Card = ({ children, className = '' }) => (
    <div className={`bg-white rounded-xl shadow-lg p-6 md:p-8 ${className}`}>
        {children}
    </div>
);

const Button = ({ children, onClick, className = '', variant = 'primary', type = 'button', disabled = false }) => {
    const baseClasses = 'px-4 py-2 font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-75 transition-all duration-200 flex items-center justify-center gap-2';
    const variants = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
        secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    };
    return <button type={type} onClick={onClick} className={`${baseClasses} ${variants[variant]} ${className}`} disabled={disabled}>{children}</button>;
};

const Input = ({ type = 'text', placeholder, value, onChange, className = '' }) => (
    <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 ${className}`}
    />
);

const Select = ({ options, value, onChange, placeholder, className = '' }) => (
    <select
        value={value}
        onChange={onChange}
        className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none ${className}`}
    >
        <option value="" disabled>{placeholder}</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
);

const Spinner = () => (
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
);

// --- Main Application Components ---

// Login and Signup Component
const AuthComponent = ({ setNotification }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const auth = getAuth();

    const handleAuthAction = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            setNotification({ type: 'error', message: 'Please enter both email and password.' });
            return;
        }
        setIsLoading(true);
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
                setNotification({ type: 'success', message: 'Logged in successfully!' });
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
                setNotification({ type: 'success', message: 'Signed up successfully! Please log in.' });
                setIsLogin(true);
            }
        } catch (error) {
            setNotification({ type: 'error', message: error.message });
            console.error("Authentication error:", error);
        } finally {
            setIsLoading(false);
            setEmail('');
            setPassword('');
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">
                    Excel Analytics Platform
                </h2>
                <p className="text-center text-gray-500 mb-6">
                    {isLogin ? 'Welcome back! Please log in.' : 'Create an account to get started.'}
                </p>
                <form onSubmit={handleAuthAction} className="space-y-4">
                    <Input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <Input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? <Spinner /> : (isLogin ? 'Login' : 'Sign Up')}
                    </Button>
                </form>
                <p className="text-center text-sm text-gray-600 mt-6">
                    {isLogin ? "Don't have an account?" : "Already have an account?"}
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="font-semibold text-blue-600 hover:underline ml-1"
                    >
                        {isLogin ? 'Sign Up' : 'Login'}
                    </button>
                </p>
            </Card>
        </div>
    );
};

// File Upload Component
const FileUploadComponent = ({ user, db, setNotification, onUploadSuccess }) => {
    const [file, setFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            const fileType = selectedFile.name.split('.').pop();
            if (fileType === 'xlsx' || fileType === 'xls') {
                setFile(selectedFile);
            } else {
                setNotification({ type: 'error', message: 'Please upload only .xls or .xlsx files.' });
                e.target.value = null;
            }
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setNotification({ type: 'error', message: 'Please select a file first.' });
            return;
        }
        setIsLoading(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = window.XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/files`), {
                    name: file.name,
                    uploadedAt: new Date(),
                    size: file.size,
                    headers: jsonData[0] || [],
                    data: JSON.stringify(jsonData.slice(1).map(row => {
                        let obj = {};
                        (jsonData[0] || []).forEach((header, i) => {
                            obj[header] = row[i];
                        });
                        return obj;
                    }))
                });
                
                setNotification({ type: 'success', message: 'File uploaded and processed successfully!' });
                onUploadSuccess();
            } catch (error) {
                console.error("Error processing or uploading file:", error);
                setNotification({ type: 'error', message: 'Failed to process the Excel file.' });
            } finally {
                setIsLoading(false);
                setFile(null);
                if(document.getElementById('file-input')) {
                    document.getElementById('file-input').value = '';
                }
            }
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <Card>
            <h3 className="text-xl font-bold text-gray-800 mb-4">Upload New Excel File</h3>
            <div className="flex flex-col sm:flex-row items-center gap-4">
                <label htmlFor="file-input" className="w-full flex-grow cursor-pointer bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-200 transition-colors">
                    <UploadIcon className="mx-auto text-gray-500 mb-2" />
                    <span className="text-gray-600">{file ? file.name : 'Click to select .xls or .xlsx file'}</span>
                    <input id="file-input" type="file" className="hidden" onChange={handleFileChange} accept=".xlsx, .xls" />
                </label>
                <Button onClick={handleUpload} disabled={isLoading || !file} className="w-full sm:w-auto">
                    {isLoading ? <Spinner /> : 'Upload & Analyze'}
                </Button>
            </div>
        </Card>
    );
};

// File History Component
const FileHistoryComponent = ({ user, db, setSelectedFile, setNotification }) => {
    const [files, setFiles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user || !db) return;
        const q = query(collection(db, `artifacts/${appId}/users/${user.uid}/files`));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const filesData = [];
            querySnapshot.forEach((doc) => {
                filesData.push({ id: doc.id, ...doc.data() });
            });
            filesData.sort((a, b) => b.uploadedAt.toDate() - a.uploadedAt.toDate());
            setFiles(filesData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching file history:", error);
            setNotification({ type: 'error', message: 'Could not fetch file history.' });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user, db, setNotification]);

    const handleFileSelect = (fileId) => {
        const selected = files.find(f => f.id === fileId);
        if (selected) {
            setSelectedFile(selected);
        }
    };

    return (
        <Card>
            <h3 className="text-xl font-bold text-gray-800 mb-4">Your Upload History</h3>
            {isLoading ? (
                <div className="flex justify-center items-center h-32"><Spinner /></div>
            ) : files.length === 0 ? (
                <p className="text-gray-500 text-center py-8">You haven't uploaded any files yet.</p>
            ) : (
                <ul className="space-y-3 max-h-96 overflow-y-auto">
                    {files.map(file => (
                        <li key={file.id} onClick={() => handleFileSelect(file.id)}
                            className="p-3 bg-gray-50 rounded-lg hover:bg-blue-100 cursor-pointer transition-colors flex justify-between items-center">
                            <div>
                                <p className="font-semibold text-gray-800">{file.name}</p>
                                <p className="text-sm text-gray-500">
                                    Uploaded on {file.uploadedAt.toDate().toLocaleDateString()}
                                </p>
                            </div>
                            <span className="text-xs font-medium bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
                                {Math.round(file.size / 1024)} KB
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
};

// Data Analysis & Visualization Component
const DataAnalysisComponent = ({ file, setSelectedFile }) => {
    const [data, setData] = useState([]);
    const [headers, setHeaders] = useState([]);
    const [xAxis, setXAxis] = useState('');
    const [yAxis, setYAxis] = useState('');
    const chartRef = useRef(null);

    useEffect(() => {
        if (file && file.data) {
            try {
                const parsedData = JSON.parse(file.data);
                setData(parsedData);
                const fileHeaders = file.headers || [];
                setHeaders(fileHeaders);
                if (fileHeaders.length > 0) setXAxis(fileHeaders[0]);
                if (fileHeaders.length > 1) setYAxis(fileHeaders[1]);
            } catch (error) {
                console.error("Error parsing file data:", error);
                setData([]);
                setHeaders([]);
            }
        }
    }, [file]);

    const handleDownloadChart = () => {
        if (chartRef.current && window.html2canvas) {
            window.html2canvas(chartRef.current, { backgroundColor: '#ffffff' }).then(canvas => {
                const link = document.createElement('a');
                link.download = `${file.name}-chart.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            });
        }
    };
    
    const numericHeaders = headers.filter(header => 
        data.length > 0 && data.every(row => typeof row[header] === 'number' || !isNaN(parseFloat(row[header])))
    );

    const chartData = data.map(row => ({
        ...row,
        [yAxis]: parseFloat(row[yAxis])
    }));

    return (
        <Card className="w-full">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-2xl font-bold text-gray-800">{file.name}</h3>
                    <p className="text-gray-500">Select columns to visualize.</p>
                </div>
                <Button onClick={() => setSelectedFile(null)} variant="secondary">Back to Files</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">X-Axis (Category)</label>
                    <Select options={headers} value={xAxis} onChange={(e) => setXAxis(e.target.value)} placeholder="Select X-Axis" />
                </div>
                <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Y-Axis (Value)</label>
                    <Select options={numericHeaders} value={yAxis} onChange={(e) => setYAxis(e.target.value)} placeholder="Select Y-Axis" />
                </div>
                <div className="md:col-span-1 flex items-end">
                    <Button onClick={handleDownloadChart} className="w-full" disabled={!xAxis || !yAxis}>Download Chart (PNG)</Button>
                </div>
            </div>

            <div className="h-96 w-full bg-gray-100 rounded-lg p-4" ref={chartRef}>
                {xAxis && yAxis ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey={xAxis} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey={yAxis} fill="#3b82f6" />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        <ChartIcon className="mr-2" />
                        Please select X and Y axes to generate a chart.
                    </div>
                )}
            </div>
        </Card>
    );
};

// Admin Dashboard Component
const AdminDashboard = ({ db, setNotification }) => {
    const [stats, setStats] = useState({ userCount: 0, fileCount: 0 });
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchAllData = useCallback(async () => {
        setIsLoading(true);
        try {
            const userArtifactsSnapshot = await getDocs(collection(db, `artifacts/${appId}/users`));
            let totalFiles = 0;
            const usersData = [];
            
            const allUsersCol = collection(db, 'users');
            const allUsersSnapshot = await getDocs(allUsersCol);
            const userEmailMap = {};
            allUsersSnapshot.forEach(doc => {
                 userEmailMap[doc.id] = doc.data().email;
            });

            for (const userDoc of userArtifactsSnapshot.docs) {
                const filesSnapshot = await getDocs(collection(db, `artifacts/${appId}/users/${userDoc.id}/files`));
                const fileCount = filesSnapshot.size;
                totalFiles += fileCount;
                usersData.push({
                    id: userDoc.id,
                    email: userEmailMap[userDoc.id] || 'N/A',
                    fileCount: fileCount,
                });
            }

            setUsers(usersData);
            setStats({ userCount: allUsersSnapshot.size, fileCount: totalFiles });

        } catch (error) {
            console.error("Error fetching admin data:", error);
            setNotification({ type: 'error', message: 'Failed to load admin dashboard data.' });
        } finally {
            setIsLoading(false);
        }
    }, [db, setNotification]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    return (
        <Card className="w-full">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Admin Dashboard</h2>
            {isLoading ? (
                <div className="flex justify-center items-center h-64"><Spinner /></div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="bg-blue-100 p-6 rounded-lg">
                            <h4 className="text-lg font-semibold text-blue-800">Total Users</h4>
                            <p className="text-4xl font-bold text-blue-900">{stats.userCount}</p>
                        </div>
                        <div className="bg-green-100 p-6 rounded-lg">
                            <h4 className="text-lg font-semibold text-green-800">Total Files Uploaded</h4>
                            <p className="text-4xl font-bold text-green-900">{stats.fileCount}</p>
                        </div>
                    </div>

                    <h3 className="text-xl font-bold text-gray-800 mb-4">User Management</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white rounded-lg shadow">
                            <thead className="bg-gray-200">
                                <tr>
                                    <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">User Email</th>
                                    <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">User ID</th>
                                    <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">Files Uploaded</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50">
                                        <td className="py-3 px-4">{user.email}</td>
                                        <td className="py-3 px-4 text-xs text-gray-600 font-mono">{user.id}</td>
                                        <td className="py-3 px-4 text-center font-semibold">{user.fileCount}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </Card>
    );
};


// Main App Component
export default function App() {
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [librariesLoaded, setLibrariesLoaded] = useState(false);
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [notification, setNotification] = useState({ type: '', message: '' });

    const [currentView, setCurrentView] = useState('main');
    const [selectedFile, setSelectedFile] = useState(null);

    const ADMIN_UIDS = ['uWqV2GSa8sZ9sYwF2aC6L8qW4pA2', 'ANOTHER_ADMIN_UID'];

    useEffect(() => {
        const loadScript = (src, id) => {
            return new Promise((resolve, reject) => {
                if (document.getElementById(id)) {
                    resolve();
                    return;
                }
                const script = document.createElement('script');
                script.src = src;
                script.id = id;
                script.async = true;
                script.onload = () => resolve();
                script.onerror = () => reject(new Error(`Script load error for ${src}`));
                document.head.appendChild(script);
            });
        };

        Promise.all([
            loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'xlsx-script'),
            loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', 'html2canvas-script')
        ]).then(() => {
            setLibrariesLoaded(true);
        }).catch(error => {
            console.error("Failed to load external libraries", error);
            setNotification({ type: 'error', message: 'Could not load required libraries.' });
        });
    }, []);

    useEffect(() => {
        const app = initializeApp(firebaseConfig);
        const authInstance = getAuth(app);
        const dbInstance = getFirestore(app);
        setAuth(authInstance);
        setDb(dbInstance);

        const authSignIn = async (auth) => {
            try {
                // eslint-disable-next-line no-undef
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    // eslint-disable-next-line no-undef
                    await signInWithCustomToken(auth, __initial_auth_token);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (error) {
                console.error("Anonymous/Custom sign-in failed", error);
            }
        };
        
        authSignIn(authInstance);

        const unsubscribe = onAuthStateChanged(authInstance, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                if (currentUser.email) {
                    const userRef = doc(dbInstance, 'users', currentUser.uid);
                    getDoc(userRef).then(docSnap => {
                        if (!docSnap.exists()) {
                            setDoc(userRef, { email: currentUser.email });
                        }
                    });
                }
                setIsAdmin(ADMIN_UIDS.includes(currentUser.uid));
            } else {
                setUser(null);
                setIsAdmin(false);
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (notification.message) {
            const timer = setTimeout(() => {
                setNotification({ type: '', message: '' });
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const handleLogout = async () => {
        if (auth) {
            await signOut(auth);
            setUser(null);
            setCurrentView('main');
            setSelectedFile(null);
            setNotification({ type: 'success', message: 'You have been logged out.' });
        }
    };

    if (isLoading || !librariesLoaded) {
        return (
            <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center">
                <Spinner />
                <p className="mt-4 text-gray-600">
                    {isLoading ? 'Loading Platform...' : 'Loading Libraries...'}
                </p>
            </div>
        );
    }

    if (!user) {
        return (
            <>
                {notification.message && (
                    <div className={`fixed top-5 right-5 p-4 rounded-lg shadow-lg text-white ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                        {notification.message}
                    </div>
                )}
                <AuthComponent setNotification={setNotification} />
            </>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 font-sans">
            {notification.message && (
                <div className={`fixed top-5 right-5 p-4 rounded-lg shadow-lg text-white z-50 ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                    {notification.message}
                </div>
            )}
            <header className="bg-white shadow-md">
                <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center">
                            <ChartIcon className="h-8 w-8 text-blue-600" />
                            <span className="font-bold text-xl ml-2 text-gray-800">Analytics Platform</span>
                        </div>
                        <div className="flex items-center gap-4">
                            {isAdmin && (
                                <Button onClick={() => setCurrentView(currentView === 'admin' ? 'main' : 'admin')} variant="secondary">
                                    <AdminIcon />
                                    {currentView === 'admin' ? 'User View' : 'Admin Panel'}
                                </Button>
                            )}
                             <span className="text-sm text-gray-600 hidden md:block">
                                {user.email || 'Anonymous User'}
                            </span>
                            <Button onClick={handleLogout} variant="secondary">
                                <LogoutIcon />
                                <span className="hidden sm:inline">Logout</span>
                            </Button>
                        </div>
                    </div>
                </nav>
            </header>

            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                {currentView === 'admin' && isAdmin ? (
                    <AdminDashboard db={db} setNotification={setNotification} />
                ) : (
                    <div className="space-y-8">
                        {selectedFile ? (
                            <DataAnalysisComponent file={selectedFile} setSelectedFile={setSelectedFile} />
                        ) : (
                            <>
                                <FileUploadComponent user={user} db={db} setNotification={setNotification} onUploadSuccess={() => setSelectedFile(null)} />
                                <FileHistoryComponent user={user} db={db} setSelectedFile={setSelectedFile} setNotification={setNotification} />
                            </>
                        )}
                    </div>
                )}
            </main>
             <footer className="text-center py-4 text-gray-500 text-sm">
                <p>PoluSuraj | Excel Analytics Platform</p>
            </footer>
        </div>
    );
}
