import { useState, useEffect } from 'react'

function App() {
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [favorites, setFavorites] = useState([])
  const [collections, setCollections] = useState({})
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    const getLinks = async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: () => {
            const links = Array.from(document.getElementsByTagName('a'))
            return links.map(link => ({
              href: link.href,
              text: link.textContent.trim(),
              isBacklink: link.rel === 'prev' || link.rel === 'back'
            }))
          }
        })

        setLinks(results[0].result)
      } catch (error) {
        console.error('Error fetching links:', error)
      } finally {
        setLoading(false)
      }
    }

    getLinks()
  }, [])

  const downloadLinks = () => {
    // Create text content
    const timestamp = new Date().toISOString().split('T')[0]
    let content = `Links extracted on ${timestamp}\n\n`
    
    links.forEach((link, index) => {
      content += `${index + 1}. ${link.text}\n`
      content += `   URL: ${link.href}\n`
      content += `   Type: ${link.isBacklink ? 'Backlink' : 'Regular link'}\n\n`
    })

    // Create and trigger download
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `links-${timestamp}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const filteredAndSearchedLinks = links
    .filter(link => {
      // Apply filters
      if (filter === 'backlinks') return link.isBacklink
      if (filter === 'regular') return !link.isBacklink
      if (filter === 'favorites') return favorites.includes(link.href)
      return true
    })
    .filter(link => {
      // Apply search
      if (!searchTerm) return true
      return (
        link.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        link.href.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })

  const exportLinks = (format) => {
    // Add export logic based on format
  }

  return (
    <div className={`w-[600px] p-6 ${isDarkMode ? 'dark bg-gray-800' : 'bg-gray-50'}`}>
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Link Saver</h1>
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700"
        >
          {isDarkMode ? '🌞' : '🌙'}
        </button>
      </div>

      {/* Search and Filters */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search links..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 rounded-lg border dark:bg-gray-700 dark:text-white"
        />
      </div>

      {/* Export Options */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => exportLinks('txt')} className="btn">
          Export TXT
        </button>
        <button onClick={() => exportLinks('json')} className="btn">
          Export JSON
        </button>
        <button onClick={() => exportLinks('csv')} className="btn">
          Export CSV
        </button>
      </div>

      {/* Links Display */}
      <div className="bg-white dark:bg-gray-700 rounded-xl shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-700">
            Found Links ({filteredAndSearchedLinks.length})
          </h2>
        </div>

        <div className="divide-y divide-gray-200 max-h-[400px] overflow-y-auto">
          {filteredAndSearchedLinks.map((link, index) => (
            <div 
              key={index} 
              className={`p-4 hover:bg-gray-50 transition-colors ${
                link.isBacklink ? 'bg-blue-50' : ''
              }`}
            >
              <p className="font-medium text-gray-900 mb-1">{link.text || '(No text)'}</p>
              <a 
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 break-all"
              >
                {link.href}
              </a>
              {link.isBacklink && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  Backlink
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default App