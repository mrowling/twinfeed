import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { useTimerStore } from '@/store/timerStore'
import { useApiSync } from '@/hooks/useApiSync'
import { useTheme } from '@/components/theme-provider'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'

function SettingsPage() {
    const { clearSessions } = useTimerStore()
    const { clearAllSessions, isLoading } = useApiSync()
    const { theme, setTheme } = useTheme()
    const [showConfirm, setShowConfirm] = useState(false)
    const [settingsChanged, setSettingsChanged] = useState(false)

    // Settings state
    const [settings, setSettings] = useState({
        twinAName: localStorage.getItem('twinAName') || 'Twin A',
        twinBName: localStorage.getItem('twinBName') || 'Twin B',
        twinAColor: localStorage.getItem('twinAColor') || 'blue',
        twinBColor: localStorage.getItem('twinBColor') || 'pink',
        defaultTimerInterval: parseInt(localStorage.getItem('timerInterval') || '100'),
    })

    const colorOptions = [
        { name: 'Blue', value: 'blue', class: 'bg-blue-500' },
        { name: 'Pink', value: 'pink', class: 'bg-pink-500' },
        { name: 'Green', value: 'green', class: 'bg-green-500' },
        { name: 'Purple', value: 'purple', class: 'bg-purple-500' },
        { name: 'Orange', value: 'orange', class: 'bg-orange-500' },
        { name: 'Red', value: 'red', class: 'bg-red-500' },
        { name: 'Yellow', value: 'yellow', class: 'bg-yellow-500' },
        { name: 'Teal', value: 'teal', class: 'bg-teal-500' },
        { name: 'Indigo', value: 'indigo', class: 'bg-indigo-500' },
        { name: 'Gray', value: 'gray', class: 'bg-gray-500' },
    ]

    const handleSettingChange = (key: string, value: string | boolean | number) => {
        setSettings(prev => ({
            ...prev,
            [key]: value
        }))
        setSettingsChanged(true)
    }

    const saveSettings = () => {
        // Save to localStorage
        localStorage.setItem('twinAName', settings.twinAName)
        localStorage.setItem('twinBName', settings.twinBName)
        localStorage.setItem('twinAColor', settings.twinAColor)
        localStorage.setItem('twinBColor', settings.twinBColor)
        localStorage.setItem('timerInterval', settings.defaultTimerInterval.toString())

        setSettingsChanged(false)

        // Show success toast (simple implementation)
        // In a real app, you'd use a proper toast component
        const toast = document.createElement('div')
        toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2'
        toast.innerHTML = '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg> Settings saved!'
        document.body.appendChild(toast)
        setTimeout(() => {
            document.body.removeChild(toast)
        }, 3000)
    }

    const handleClearAllData = async () => {
        if (!showConfirm) {
            setShowConfirm(true)
            return
        }

        try {
            // Clear from backend
            await clearAllSessions()

            // Clear local storage
            clearSessions()
            localStorage.removeItem('twinfeed-timer-storage')

            setShowConfirm(false)

            // Show success toast
            const toast = document.createElement('div')
            toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2'
            toast.innerHTML = '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg> All data cleared!'
            document.body.appendChild(toast)
            setTimeout(() => {
                document.body.removeChild(toast)
            }, 3000)
        } catch (error) {
            console.error('Failed to clear data:', error)
        }
    }

    const resetSettings = () => {
        setSettings({
            twinAName: 'Twin A',
            twinBName: 'Twin B',
            twinAColor: 'blue',
            twinBColor: 'pink',
            defaultTimerInterval: 100,
        })
        setSettingsChanged(true)
    }

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                    Settings
                </h2>
                <p className="text-muted-foreground">
                    Customize your TwinFeed experience
                </p>
            </div>

            {/* Twin Names */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Twin Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium text-foreground">First Twin</h4>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                                Name
                            </label>
                            <Input
                                value={settings.twinAName}
                                onChange={(e) => handleSettingChange('twinAName', e.target.value)}
                                placeholder="Twin A"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                                Color
                            </label>
                            <div className="grid grid-cols-5 gap-2">
                                {colorOptions.map((color) => (
                                    <button
                                        key={color.value}
                                        type="button"
                                        onClick={() => handleSettingChange('twinAColor', color.value)}
                                        className={`w-8 h-8 rounded-full ${color.class} border-2 transition-all ${settings.twinAColor === color.value
                                                ? 'border-foreground ring-2 ring-offset-2 ring-foreground'
                                                : 'border-border hover:border-foreground'
                                            }`}
                                        title={color.name}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-sm font-medium text-foreground">Second Twin</h4>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                                Name
                            </label>
                            <Input
                                value={settings.twinBName}
                                onChange={(e) => handleSettingChange('twinBName', e.target.value)}
                                placeholder="Twin B"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                                Color
                            </label>
                            <div className="grid grid-cols-5 gap-2">
                                {colorOptions.map((color) => (
                                    <button
                                        key={color.value}
                                        type="button"
                                        onClick={() => handleSettingChange('twinBColor', color.value)}
                                        className={`w-8 h-8 rounded-full ${color.class} border-2 transition-all ${settings.twinBColor === color.value
                                                ? 'border-foreground ring-2 ring-offset-2 ring-foreground'
                                                : 'border-border hover:border-foreground'
                                            }`}
                                        title={color.name}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Timer Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Timer Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                            Timer Update Interval
                        </label>
                        <Select
                            value={settings.defaultTimerInterval.toString()}
                            onValueChange={(value) => handleSettingChange('defaultTimerInterval', parseInt(value))}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="100">100ms (Smooth)</SelectItem>
                                <SelectItem value="500">500ms (Balanced)</SelectItem>
                                <SelectItem value="1000">1000ms (Battery Saving)</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Lower values provide smoother updates but use more battery
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Theme Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Appearance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <label className="text-sm font-medium text-foreground">Theme</label>
                            <p className="text-xs text-muted-foreground">
                                Choose your preferred theme
                            </p>
                        </div>
                        <Select value={theme} onValueChange={setTheme}>
                            <SelectTrigger className="w-[130px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="light">Light</SelectItem>
                                <SelectItem value="dark">Dark</SelectItem>
                                <SelectItem value="system">System</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {settingsChanged && (
                        <Button onClick={saveSettings} className="w-full" size="lg">
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Save Settings
                        </Button>
                    )}

                    <Button onClick={resetSettings} variant="outline" className="w-full" size="lg">
                        Reset to Defaults
                    </Button>

                    <div className="border-t pt-4">
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-destructive" />
                                Danger Zone
                            </h4>
                            {!showConfirm ? (
                                <Button
                                    onClick={handleClearAllData}
                                    disabled={isLoading}
                                    variant="destructive"
                                    className="w-full"
                                    size="lg"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Clearing...
                                        </>
                                    ) : (
                                        'Clear All Data'
                                    )}
                                </Button>
                            ) : (
                                <div className="space-y-3">
                                    <div className="p-3 border border-destructive rounded-lg bg-destructive/5">
                                        <p className="text-sm text-destructive text-center font-medium">
                                            ⚠️ This will permanently delete all feeding sessions and timer data!
                                        </p>
                                    </div>
                                    <div className="flex space-x-2">
                                        <Button
                                            onClick={() => setShowConfirm(false)}
                                            variant="outline"
                                            className="flex-1"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleClearAllData}
                                            disabled={isLoading}
                                            variant="destructive"
                                            className="flex-1"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Clearing...
                                                </>
                                            ) : (
                                                'Yes, Delete All'
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* App Info */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">About</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Version:</span>
                            <Badge variant="outline" className="font-mono">1.0.0</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">License:</span>
                            <Badge variant="outline">MIT</Badge>
                        </div>
                    </div>
                    <div className="pt-4 border-t">
                        <p className="text-xs text-muted-foreground text-center">
                            TwinFeed - A mobile-friendly breastfeeding tracker for twins
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default SettingsPage