import React, { useState, useRef } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, SafeAreaView, 
  StatusBar, Alert, PermissionsAndroid, Platform 
} from 'react-native';
import Pdf from 'react-native-pdf';
import * as DocumentPicker from 'expo-document-picker';
import * as Speech from 'expo-speech';
import RecordScreen from 'react-native-record-screen';
import * as ScreenOrientation from 'expo-screen-orientation';
import Svg, { Path } from 'react-native-svg';

export default function App() {
  const [pdfUri, setPdfUri] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  // Fullscreen & Orientation State
  const [isLandscape, setIsLandscape] = useState(false);

  // Pen & Drawing States
  const [penMode, setPenMode] = useState(false);
  const [isHighlighter, setIsHighlighter] = useState(false);
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState('');

  const pdfRef = useRef(null);

  // --- 1. FULLSCREEN / 16:9 LANDSCAPE TOGGLE ---
  const toggleFullScreen = async () => {
    if (isLandscape) {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      setIsLandscape(false);
    } else {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_LEFT);
      setIsLandscape(true);
    }
  };

  // --- 2. PEN & DRAWING ENGINE ---
  const togglePen = () => {
    setPenMode(!penMode);
    setIsHighlighter(false);
  };

  const toggleHighlighter = () => {
    if (!penMode) setPenMode(true);
    setIsHighlighter(!isHighlighter);
  };

  const handleTouchStart = (e) => {
    if (!penMode) return;
    const { locationX, locationY } = e.nativeEvent;
    setCurrentPath(`M ${locationX} ${locationY}`);
  };

  const handleTouchMove = (e) => {
    if (!penMode) return;
    const { locationX, locationY } = e.nativeEvent;
    setCurrentPath((prev) => `${prev} L ${locationX} ${locationY}`);
  };

  const handleTouchEnd = () => {
    if (!penMode || !currentPath) return;
    const newStroke = {
      path: currentPath,
      color: isHighlighter ? 'rgba(255, 235, 59, 0.5)' : 'rgba(255, 50, 50, 0.8)',
      strokeWidth: isHighlighter ? 18 : 3,
    };
    setPaths([...paths, newStroke]);
    setCurrentPath('');
  };

  const undoLastStroke = () => {
    setPaths(paths.slice(0, -1));
  };

  // --- 3. PERMISSIONS & RECORDING ---
  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const permissionsToAsk = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
        if (Platform.Version < 33) {
          permissionsToAsk.push(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
          permissionsToAsk.push(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
        }
        const grants = await PermissionsAndroid.requestMultiple(permissionsToAsk);
        const audioGranted = grants['android.permission.RECORD_AUDIO'] === PermissionsAndroid.RESULTS.GRANTED;
        const storageGranted = Platform.Version >= 33 || grants['android.permission.WRITE_EXTERNAL_STORAGE'] === PermissionsAndroid.RESULTS.GRANTED;
        return audioGranted && storageGranted;
      } catch (err) {
        return false;
      }
    }
    return true;
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (result.assets && result.assets.length > 0) {
        setPdfUri(result.assets[0].uri);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to load PDF');
    }
  };

  const toggleTTS = () => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      Speech.speak("Reading study material activated.", {
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
      });
      setIsSpeaking(true);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      const res = await RecordScreen.stopRecording().catch((error) => console.warn(error));
      if (res) Alert.alert('Recording Saved', `Video saved to: ${res.result.outputURL}`);
      setIsRecording(false);
    } else {
      const hasPermissions = await requestPermissions();
      if (!hasPermissions) {
        Alert.alert('Permission Denied', 'Microphone and Storage access are required.');
        return;
      }
      const res = await RecordScreen.startRecording().catch((error) => console.warn(error));
      if (res === 'started') {
        setIsRecording(true);
        Alert.alert('Recording Started', 'Capturing screen...');
      }
    }
  };

  const theme = isDarkMode ? darkTheme : lightTheme;

  if (!pdfUri) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bgBody }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <View style={styles.uploadOverlay}>
          <Text style={[styles.uploadTitle, { color: theme.accent }]}>📚 Load Study Material</Text>
          <TouchableOpacity style={[styles.uploadBox, { borderColor: theme.accent, backgroundColor: theme.bgNav }]} onPress={pickDocument}>
            <Text style={styles.uploadBtnText}>Choose PDF File</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bgBody }]}>
      <StatusBar hidden={isLandscape} barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      {/* Top Header Controls */}
      <View style={[styles.topBar, { backgroundColor: theme.bgNav, borderBottomColor: theme.borderColor }]}>
        <Text style={[styles.appTitle, { color: theme.textMain }]} numberOfLines={1}>Document Viewer</Text>
        <View style={styles.controlsGroup}>
          
          {/* Undo Button */}
          {penMode && (
            <TouchableOpacity style={[styles.iconBtn, { borderColor: theme.borderColor }]} onPress={undoLastStroke}>
              <Text style={{ color: theme.textMain }}>↩️</Text>
            </TouchableOpacity>
          )}

          {/* Record Button */}
          <TouchableOpacity style={[styles.iconBtn, isRecording && styles.iconBtnRecord, { borderColor: theme.borderColor }]} onPress={toggleRecording}>
            <Text style={{ color: isRecording ? '#ff0000' : theme.textMain }}>{isRecording ? '⏹️' : '⏺️'}</Text>
          </TouchableOpacity>

          {/* Pen Button */}
          <TouchableOpacity style={[styles.iconBtn, penMode && !isHighlighter && styles.iconBtnActive, { borderColor: theme.borderColor }]} onPress={togglePen}>
            <Text style={{ color: theme.textMain }}>🖋️</Text>
          </TouchableOpacity>

          {/* Highlighter Button */}
          <TouchableOpacity style={[styles.iconBtn, isHighlighter && styles.iconBtnHighlight, { borderColor: theme.borderColor }]} onPress={toggleHighlighter}>
            <Text style={{ color: theme.textMain }}>🖍️</Text>
          </TouchableOpacity>

          {/* Read Aloud */}
          <TouchableOpacity style={[styles.iconBtn, { borderColor: theme.borderColor }]} onPress={toggleTTS}>
            <Text style={{ color: theme.textMain }}>{isSpeaking ? '⏸️' : '🔊'}</Text>
          </TouchableOpacity>

          {/* Theme Toggle */}
          <TouchableOpacity style={[styles.iconBtn, { borderColor: theme.borderColor }]} onPress={() => setIsDarkMode(!isDarkMode)}>
            <Text style={{ color: theme.textMain }}>🌓</Text>
          </TouchableOpacity>

          {/* Fullscreen 16:9 Landscape Toggle */}
          <TouchableOpacity style={[styles.iconBtn, isLandscape && styles.iconBtnActive, { borderColor: theme.borderColor }]} onPress={toggleFullScreen}>
            <Text style={{ color: theme.textMain }}>⛶</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress Line */}
      {!isLandscape && (
        <View style={[styles.progressContainer, { backgroundColor: theme.borderColor }]}>
          <View style={[styles.progressBar, { width: `${(currentPage / totalPages) * 100}%`, backgroundColor: theme.accent }]} />
        </View>
      )}

      {/* Main Viewport containing PDF and SVG Drawing Layer */}
      <View style={styles.readerViewport}>
        <Pdf
          ref={pdfRef}
          source={{ uri: pdfUri, cache: true }}
          onLoadComplete={(numberOfPages) => setTotalPages(numberOfPages)}
          onPageChanged={(page) => setCurrentPage(page)}
          style={[styles.pdf, isDarkMode && { opacity: 0.85 }]}
        />

        {/* SVG Drawing Canvas Overlay */}
        <View 
          style={styles.drawingOverlay}
          pointerEvents={penMode ? 'auto' : 'none'}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <Svg style={StyleSheet.absoluteFill}>
            {paths.map((item, index) => (
              <Path key={index} d={item.path} stroke={item.color} strokeWidth={item.strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            ))}
            {currentPath !== '' && (
              <Path d={currentPath} stroke={isHighlighter ? 'rgba(255, 235, 59, 0.5)' : 'rgba(255, 50, 50, 0.8)'} strokeWidth={isHighlighter ? 18 : 3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            )}
          </Svg>
        </View>
      </View>

      {/* Bottom Navigation */}
      {!isLandscape && (
        <View style={[styles.bottomBar, { backgroundColor: theme.bgNav, borderTopColor: theme.borderColor }]}>
          <TouchableOpacity 
            style={[styles.navBtn, { backgroundColor: currentPage === 1 ? theme.borderColor : theme.accent }]} 
            disabled={currentPage === 1}
            onPress={() => pdfRef.current?.setPage(currentPage - 1)}
          >
            <Text style={styles.navBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.pageIndicator, { color: theme.textMain }]}>
            Page {currentPage} of {totalPages}
          </Text>
          <TouchableOpacity 
            style={[styles.navBtn, { backgroundColor: currentPage === totalPages ? theme.borderColor : theme.accent }]} 
            disabled={currentPage === totalPages}
            onPress={() => pdfRef.current?.setPage(currentPage + 1)}
          >
            <Text style={styles.navBtnText}>→</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const lightTheme = { bgBody: '#f0f4f8', bgNav: '#ffffff', textMain: '#333333', borderColor: '#e1e8ed', accent: '#4a90e2' };
const darkTheme = { bgBody: '#121212', bgNav: '#1e1e1e', textMain: '#e0e0e0', borderColor: '#333333', accent: '#1976d2' };

const styles = StyleSheet.create({
  container: { flex: 1 },
  uploadOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  uploadTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  uploadBox: { borderWidth: 2, borderStyle: 'dashed', padding: 40, borderRadius: 10, alignItems: 'center' },
  uploadBtnText: { color: '#4a90e2', fontWeight: 'bold', fontSize: 16 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 8, borderBottomWidth: 1 },
  appTitle: { fontSize: 16, fontWeight: 'bold', flex: 1 },
  controlsGroup: { flexDirection: 'row', gap: 6 },
  iconBtn: { padding: 6, borderWidth: 1, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  iconBtnRecord: { backgroundColor: 'rgba(255, 0, 0, 0.2)', borderColor: '#ff0000' },
  iconBtnActive: { backgroundColor: 'rgba(255, 50, 50, 0.2)', borderColor: '#ff3232' },
  iconBtnHighlight: { backgroundColor: 'rgba(255, 235, 59, 0.3)', borderColor: '#ffeb3b' },
  progressContainer: { height: 4, width: '100%' },
  progressBar: { height: '100%' },
  readerViewport: { flex: 1, position: 'relative', width: '100%' },
  pdf: { flex: 1, width: '100%', height: '100%' },
  drawingOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 10 },
  bottomBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 8, borderTopWidth: 1 },
  navBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 5 },
  navBtnText: { color: 'white', fontWeight: 'bold' },
  pageIndicator: { fontSize: 14 },
});
