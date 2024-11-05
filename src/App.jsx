import { useState, useEffect } from 'react'

function App() {
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all', 'backlinks', 'regular'

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

  const filteredLinks = links.filter(link => {
    if (filter === 'backlinks') return link.isBacklink
    if (filter === 'regular') return !link.isBacklink
    return true
  })

  return (
    <div className="w-[600px] p-6 bg-gray-50 min-h-[400px]">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Link Saver</h1>
      
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <>
          <div className="flex gap-4 mb-6">
            <button
              onClick={downloadLinks}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                       transition-colors flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Download Links
            </button>

            <select 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Links</option>
              <option value="backlinks">Backlinks Only</option>
              <option value="regular">Regular Links Only</option>
            </select>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-700">
                Found Links ({filteredLinks.length})
              </h2>
            </div>

            <div className="divide-y divide-gray-200 max-h-[400px] overflow-y-auto">
              {filteredLinks.map((link, index) => (
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
        </>
      )}
    </div>
  )
}

export default App