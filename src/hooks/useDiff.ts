import { useState, useEffect } from 'react';
import { DiffResult, parseFile, computeDiff } from '@/lib/diffUtils';

export function useDiff() {
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [csv1Data, setCsv1Data] = useState<string[][]>([]);
  const [csv2Data, setCsv2Data] = useState<string[][]>([]);
  const [diff, setDiff] = useState<DiffResult[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [hasCompared, setHasCompared] = useState(false);

  const handleFileChange = async (file: File, fileNumber: 1 | 2) => {
    if (fileNumber === 1) {
      setFile1(file);
    } else {
      setFile2(file);
    }

    const text = await file.text();
    const data = parseFile(text, file.name);

    if (fileNumber === 1) {
      setCsv1Data(data);
    } else {
      setCsv2Data(data);
    }
  };

  const compareFiles = () => {
    setIsComparing(true);
    setHasCompared(false);

    setTimeout(() => {
      const results = computeDiff(csv1Data, csv2Data);
      setDiff(results);
      setHasCompared(true);
      setIsComparing(false);
    }, 100);
  };

  const handleStartOver = () => {
    setFile1(null);
    setFile2(null);
    setCsv1Data([]);
    setCsv2Data([]);
    setDiff([]);
    setHasCompared(false);
    setIsComparing(false);
  };

  useEffect(() => {
    if (file1 && file2 && csv1Data.length > 0 && csv2Data.length > 0 && !isComparing && !hasCompared) {
      compareFiles();
    }
  }, [file1, file2, csv1Data, csv2Data]);

  return {
    file1,
    file2,
    diff,
    isComparing,
    hasCompared,
    handleFileChange,
    handleStartOver,
  };
}
