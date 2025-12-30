import { useState, useCallback } from 'react';
import { 
  Download, 
  Upload, 
  Trash2, 
  Info, 
  Moon, 
  Sun, 
  Monitor,
  Database,
  Shield,
  FileText
} from 'lucide-react';
import { MobileHeader } from '@/components/navigation';
import { useIsMobile } from '@/hooks';
import { useSettings, updateSettings, db, getStorageEstimate } from '@/db';
import { importGedcom, exportGedcom } from '@/lib/gedcom';
import { 
  Button, 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import type { Settings } from '@/types';

export function SettingsPage() {
  const isMobile = useIsMobile();
  const settings = useSettings();
  const [storageInfo, setStorageInfo] = useState<{ usage: number; quota: number } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExportingGedcom, setIsExportingGedcom] = useState(false);
  const [isImportingGedcom, setIsImportingGedcom] = useState(false);

  // Load storage info
  useState(() => {
    getStorageEstimate().then(setStorageInfo);
  });

  const handleThemeChange = useCallback(async (theme: Settings['theme']) => {
    await updateSettings({ theme });
    
    // Apply theme to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // System preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDark);
    }
  }, []);

  const handleExportGedcom = useCallback(async () => {
    setIsExportingGedcom(true);
    try {
      const gedcomContent = await exportGedcom();
      const blob = new Blob([gedcomContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-kin-map-${new Date().toISOString().split('T')[0]}.ged`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('GEDCOM export failed:', error);
      alert('GEDCOM export failed. Please try again.');
    } finally {
      setIsExportingGedcom(false);
    }
  }, []);

  const handleImportGedcom = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ged,.gedcom';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsImportingGedcom(true);
      try {
        const text = await file.text();
        const confirmed = window.confirm(
          'This will import a GEDCOM file. Existing data will be preserved, but duplicate entries may be created. Continue?'
        );
        if (!confirmed) return;

        const result = await importGedcom(text);
        alert(`Import successful! Imported ${result.persons} people and ${result.families} families.`);
        window.location.reload();
      } catch (error) {
        console.error('GEDCOM import failed:', error);
        alert('GEDCOM import failed. Please check the file format and try again.');
      } finally {
        setIsImportingGedcom(false);
      }
    };

    input.click();
  }, []);

  const handleExportJSON = useCallback(async () => {
    setIsExporting(true);
    try {
      const persons = await db.persons.toArray();
      const families = await db.families.toArray();
      const trees = await db.trees.toArray();

      // Convert photos to base64
      const personsWithPhotos = await Promise.all(
        persons.map(async (person) => {
          let photoBase64: string | undefined;
          if (person.photo) {
            const buffer = await person.photo.arrayBuffer();
            photoBase64 = btoa(
              new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
            );
          }
          return {
            ...person,
            photo: photoBase64,
            photoThumbnail: undefined, // Don't export thumbnails
          };
        })
      );

      const exportData = {
        version: 1,
        exportDate: new Date().toISOString(),
        persons: personsWithPhotos,
        families,
        trees,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-kin-map-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      await updateSettings({ lastBackupDate: new Date() });
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, []);

  const handleImportJSON = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsImporting(true);
      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!data.version || !data.persons) {
          throw new Error('Invalid backup file format');
        }

        // Confirm import
        const confirmed = window.confirm(
          `This will import ${data.persons.length} people and ${data.families?.length ?? 0} families. ` +
          'Existing data with the same IDs will be overwritten. Continue?'
        );
        if (!confirmed) return;

        // Import persons
        for (const person of data.persons) {
          // Convert base64 photo back to Blob
          let photoBlob: Blob | undefined;
          if (person.photo && typeof person.photo === 'string') {
            const binary = atob(person.photo);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            photoBlob = new Blob([bytes]);
          }

          await db.persons.put({
            ...person,
            photo: photoBlob,
            createdAt: new Date(person.createdAt),
            updatedAt: new Date(person.updatedAt),
          });
        }

        // Import families
        if (data.families) {
          for (const family of data.families) {
            await db.families.put({
              ...family,
              createdAt: new Date(family.createdAt),
              updatedAt: new Date(family.updatedAt),
            });
          }
        }

        // Import trees
        if (data.trees) {
          for (const tree of data.trees) {
            await db.trees.put({
              ...tree,
              createdAt: new Date(tree.createdAt),
              updatedAt: new Date(tree.updatedAt),
            });
          }
        }

        alert('Import successful!');
        window.location.reload();
      } catch (error) {
        console.error('Import failed:', error);
        alert('Import failed. Please check the file format and try again.');
      } finally {
        setIsImporting(false);
      }
    };

    input.click();
  }, []);

  const handleClearData = useCallback(async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete ALL data? This cannot be undone. ' +
      'Please export a backup first!'
    );
    if (!confirmed) return;

    const doubleConfirmed = window.confirm(
      'This is your last chance! All people, families, and photos will be permanently deleted.'
    );
    if (!doubleConfirmed) return;

    await db.persons.clear();
    await db.families.clear();
    await db.trees.clear();

    alert('All data has been deleted.');
    window.location.reload();
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col h-full">
      {isMobile && <MobileHeader title="Settings" />}
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 md:pb-4">
        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sun className="h-4 w-4" />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm">Theme</span>
              <Select
                value={settings?.theme ?? 'system'}
                onValueChange={(value) => handleThemeChange(value as Settings['theme'])}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <span className="flex items-center gap-2">
                      <Sun className="h-4 w-4" /> Light
                    </span>
                  </SelectItem>
                  <SelectItem value="dark">
                    <span className="flex items-center gap-2">
                      <Moon className="h-4 w-4" /> Dark
                    </span>
                  </SelectItem>
                  <SelectItem value="system">
                    <span className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" /> System
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" />
              Data Management
            </CardTitle>
            <CardDescription>
              Your data is stored locally on this device
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Storage info */}
            {storageInfo && (
              <div className="text-sm text-muted-foreground">
                Using {formatBytes(storageInfo.usage)} of {formatBytes(storageInfo.quota)}
                <div className="w-full h-2 bg-muted rounded-full mt-2 overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(storageInfo.usage / storageInfo.quota) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Last backup */}
            {settings?.lastBackupDate && (
              <p className="text-sm text-muted-foreground">
                Last backup: {new Date(settings.lastBackupDate).toLocaleDateString()}
              </p>
            )}

            <div className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground font-medium">Full Backup</p>
              <Button
                variant="outline"
                onClick={handleExportJSON}
                disabled={isExporting}
                className="justify-start"
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Export Backup (JSON)'}
              </Button>
              <Button
                variant="outline"
                onClick={handleImportJSON}
                disabled={isImporting}
                className="justify-start"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isImporting ? 'Importing...' : 'Import from Backup'}
              </Button>
              
              <p className="text-xs text-muted-foreground font-medium mt-2">GEDCOM (Family Tree Standard)</p>
              <Button
                variant="outline"
                onClick={handleExportGedcom}
                disabled={isExportingGedcom}
                className="justify-start"
              >
                <FileText className="h-4 w-4 mr-2" />
                {isExportingGedcom ? 'Exporting...' : 'Export GEDCOM'}
              </Button>
              <Button
                variant="outline"
                onClick={handleImportGedcom}
                disabled={isImportingGedcom}
                className="justify-start"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isImportingGedcom ? 'Importing...' : 'Import GEDCOM'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={handleClearData}
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete All Data
            </Button>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-4 w-4" />
              About
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong>My Kin Map</strong> is a local-first family tree application.
            </p>
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                Your data stays on your device. We don't collect or store any personal information on servers.
              </p>
            </div>
            <p className="pt-2 border-t">
              Version 1.0.0
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
