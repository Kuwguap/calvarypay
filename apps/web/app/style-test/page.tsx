/**
 * Style Test Page
 * Test if Tailwind CSS and styling is working properly
 */

export default function StyleTestPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-center mb-8">
          🎨 CalvaryPay Style Test
        </h1>
        
        {/* Basic Colors Test */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-blue-400">Color Test</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-600 p-4 rounded-lg text-center">
              <p className="text-white font-medium">Blue</p>
            </div>
            <div className="bg-emerald-600 p-4 rounded-lg text-center">
              <p className="text-white font-medium">Emerald</p>
            </div>
            <div className="bg-red-600 p-4 rounded-lg text-center">
              <p className="text-white font-medium">Red</p>
            </div>
            <div className="bg-yellow-600 p-4 rounded-lg text-center">
              <p className="text-white font-medium">Yellow</p>
            </div>
          </div>
        </div>

        {/* Layout Test */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-purple-400">Layout Test</h2>
          <div className="bg-slate-800 p-6 rounded-lg">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 bg-slate-700 p-4 rounded">
                <h3 className="text-lg font-medium mb-2">Flex Item 1</h3>
                <p className="text-slate-300">This should be responsive and flex properly.</p>
              </div>
              <div className="flex-1 bg-slate-700 p-4 rounded">
                <h3 className="text-lg font-medium mb-2">Flex Item 2</h3>
                <p className="text-slate-300">This should be responsive and flex properly.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Typography Test */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-green-400">Typography Test</h2>
          <div className="bg-slate-800 p-6 rounded-lg space-y-4">
            <h1 className="text-4xl font-bold">Heading 1 - 4xl Bold</h1>
            <h2 className="text-3xl font-semibold">Heading 2 - 3xl Semibold</h2>
            <h3 className="text-2xl font-medium">Heading 3 - 2xl Medium</h3>
            <p className="text-lg">Large paragraph text - lg</p>
            <p className="text-base">Base paragraph text - base</p>
            <p className="text-sm text-slate-400">Small text - sm slate-400</p>
            <code className="font-mono bg-slate-700 px-2 py-1 rounded text-green-400">
              Code text with mono font
            </code>
          </div>
        </div>

        {/* Spacing Test */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-orange-400">Spacing Test</h2>
          <div className="bg-slate-800 p-6 rounded-lg">
            <div className="space-y-2">
              <div className="bg-blue-600 h-4 w-full rounded"></div>
              <div className="bg-blue-600 h-4 w-3/4 rounded"></div>
              <div className="bg-blue-600 h-4 w-1/2 rounded"></div>
              <div className="bg-blue-600 h-4 w-1/4 rounded"></div>
            </div>
          </div>
        </div>

        {/* Button Test */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-pink-400">Button Test</h2>
          <div className="bg-slate-800 p-6 rounded-lg">
            <div className="flex flex-wrap gap-4">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                Primary Button
              </button>
              <button className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors">
                Secondary Button
              </button>
              <button className="border border-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors">
                Outline Button
              </button>
              <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors">
                Success Button
              </button>
              <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors">
                Danger Button
              </button>
            </div>
          </div>
        </div>

        {/* Animation Test */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-cyan-400">Animation Test</h2>
          <div className="bg-slate-800 p-6 rounded-lg">
            <div className="flex gap-4">
              <div className="w-16 h-16 bg-blue-600 rounded-lg animate-pulse"></div>
              <div className="w-16 h-16 bg-emerald-600 rounded-lg animate-bounce"></div>
              <div className="w-16 h-16 bg-red-600 rounded-lg animate-spin"></div>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="bg-emerald-900/50 border border-emerald-500/30 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-emerald-400 mb-2">
            ✅ Style Test Status
          </h2>
          <p className="text-emerald-300">
            If you can see this page with proper colors, spacing, and layout, then Tailwind CSS is working correctly!
          </p>
          <div className="mt-4 space-y-2">
            <p className="text-sm text-emerald-400">✓ Colors are displaying</p>
            <p className="text-sm text-emerald-400">✓ Layout is responsive</p>
            <p className="text-sm text-emerald-400">✓ Typography is styled</p>
            <p className="text-sm text-emerald-400">✓ Spacing is consistent</p>
            <p className="text-sm text-emerald-400">✓ Animations are working</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="text-center space-y-4">
          <h3 className="text-lg font-medium text-slate-300">Navigation Test</h3>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="/" className="text-blue-400 hover:text-blue-300 underline">
              Home Page
            </a>
            <a href="/auth/signin" className="text-blue-400 hover:text-blue-300 underline">
              Sign In
            </a>
            <a href="/auth/signup" className="text-blue-400 hover:text-blue-300 underline">
              Sign Up
            </a>
            <a href="/minimal-test" className="text-blue-400 hover:text-blue-300 underline">
              Minimal Test
            </a>
            <a href="/diagnostic" className="text-blue-400 hover:text-blue-300 underline">
              Diagnostic
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
