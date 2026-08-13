import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, SafeAreaView, 
  StatusBar, Alert, PermissionsAndroid, Platform 
} from 'react-native';
import Pdf from 'react-native-pdf';
import * as DocumentPicker from 'expo-document-picker';
import * as Speech from 'expo-speech';
import RecordScreen from 'react-native-record-screen';

export default function App() {
  const [pdfUri, setPdfUri] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const pdfRef = useRef(null);

  // Ask for Android Permissions at runtime
  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const grants = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ]);
        
        return (
          grants['android.permission.RECORD_AUDIO'] === PermissionsAndroid.RESULTS.GRANTED &&
          grants['android.permission.WRITE_EXTERNAL_STORAGE'] === PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (err) {
        console.warn(err);
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
      // Stop Recording
      const res = await RecordScreen.stopRecording().catch((error) => console.warn(error));
      if (res) {
        Alert.alert('Recording Saved', `Video saved to: ${res.result.outputURL}`);
      }
      setIsRecording(false);
    } else {
      // Request permissions, then start
      const hasPermissions = await requestPermissions();
      if (!hasPermissions) {
        Alert.alert('Permission Denied', 'Microphone and Storage access are required to record study sessions.');
        return;
      }

      const res = await RecordScreen.startRecording().catch((error) => console.warn(error));
      if (res === 'started') {
        setIsRecording(true);
        Alert.alert('Recording Started', 'Your screen and audio are now being recorded.');
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
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      <View style={[styles.topBar, { backgroundColor: theme.bgNav, borderBottomColor: theme.borderColor }]}>
        <Text style={[styles.appTitle, { color: theme.textMain }]} numberOfLines={1}>Document Viewer</Text>
        <View style={styles.controlsGroup}>
          <TouchableOpacity 
            style={[styles.iconBtn, isRecording && styles.iconBtnRecord, { borderColor: theme.borderColor }]} 
            onPress={toggleRecording}
          >
            <Text style={{ color: isRecording ? '#ff0000' : theme.textMain }}>{isRecording ? '⏹️' : '⏺️'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, { borderColor: theme.borderColor }]} onPress={toggleTTS}>
            <Text style={{ color: theme.textMain }}>{isSpeaking ? '⏸️' : '🔊'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, { borderColor: theme.borderColor }]} onPress={() => setIsDarkMode(!isDarkMode)}>
            <Text style={{ color: theme.textMain }}>🌓</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.progressContainer, { backgroundColor: theme.borderColor }]}>
        <View style={[styles.progressBar, { width: `${(currentPage / totalPages) * 100}%`, backgroundColor: theme.accent }]} />
      </View>

      <View style={styles.readerViewport}>
        <Pdf
          ref={pdfRef}
          source={{ uri: pdfUri, cache: true }}
          onLoadComplete={(numberOfPages) => setTotalPages(numberOfPages)}
          onPageChanged={(page) => setCurrentPage(page)}
          onError={(error) => console.log(error)}
          style={[styles.pdf, isDarkMode && { opacity: 0.85 }]}
        />
      </View>

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
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderBottomWidth: 1 },
  appTitle: { fontSize: 18, fontWeight: 'bold', flex: 1 },
  controlsGroup: { flexDirection: 'row', gap: 8 },
  iconBtn: { padding: 8, borderWidth: 1, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  iconBtnRecord: { backgroundColor: 'rgba(255, 0, 0, 0.2)', borderColor: '#ff0000' },
  progressContainer: { height: 4, width: '100%' },
  progressBar: { height: '100%' },
  readerViewport: { flex: 1, position: 'relative', width: '100%' },
  pdf: { flex: 1, width: '100%', height: '100%' },
  bottomBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderTopWidth: 1 },
  navBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 5 },
  navBtnText: { color: 'white', fontWeight: 'bold' },
  pageIndicator: { fontSize: 16 },
});
