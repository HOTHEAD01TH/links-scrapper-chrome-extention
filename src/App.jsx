import { useState, useEffect } from 'react'

function App() {
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [favorites, setFavorites] = useState([]);
  const [collections, setCollections] = useState({})
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [categories, setCategories] = useState([])
  const [linkStats, setLinkStats] = useState({
    totalLinks: 0,
    backlinks: 0,
    domains: new Set(),
    commonDomains: {}
  })
  const [selectedLinks, setSelectedLinks] = useState([])
  const [collaborators, setCollaborators] = useState([])
  const [deadLinks, setDeadLinks] = useState(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [isCheckingLinks, setIsCheckingLinks] = useState(false);

  const bulkActions = {
    delete: () => {/* ... */},
    export: () => {/* ... */},
    categorize: () => {/* ... */}
  }

  useEffect(() => {
    const getLinks = async () => {
      try {
        const [tab] = await chrome.tabs.query({ 
          active: true, 
          currentWindow: true 
        });
        
        if (!tab?.id) {
          console.error('No active tab found');
          setLoading(false);
          return;
        }

        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: () => {
            try {
              const links = Array.from(document.getElementsByTagName('a'));
              return links.map(link => ({
                href: link.href,
                text: link.textContent.trim(),
                isBacklink: link.rel === 'prev' || link.rel === 'back'
              }));
            } catch (error) {
              console.error('Error in content script:', error);
              return [];
            }
          }
        });

        if (results?.[0]?.result) {
          setLinks(results[0].result);
        } else {
          console.error('No results from executeScript');
          setLinks([]);
        }
      } catch (error) {
        console.error('Error fetching links:', error);
        // Show error state to user
        setLinks([]);
      } finally {
        setLoading(false);
      }
    };

    getLinks();
  }, []);

  useEffect(() => {
    const checkDeadLinks = async () => {
      const deadOnes = new Set();
      
      for (const link of links) {
        try {
          // Use the background script to check links
          const isAlive = await chrome.runtime.sendMessage({
            type: 'CHECK_LINK',
            url: link.href
          });
          
          if (!isAlive) {
            deadOnes.add(link.href);
          }
        } catch (error) {
          deadOnes.add(link.href);
        }
      }
      
      setDeadLinks(deadOnes);
    };

    if (links.length > 0) {
      checkDeadLinks();
    }
  }, [links]);

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
    const timestamp = new Date().toISOString().split('T')[0];
    let content = '';
    let type = '';
    let extension = '';

    switch(format) {
      case 'json':
        content = JSON.stringify(links, null, 2);
        type = 'application/json';
        extension = 'json';
        break;
      case 'csv':
        content = 'Text,URL,Type\n' + links.map(link => 
          `"${link.text}","${link.href}","${link.isBacklink ? 'Backlink' : 'Regular'}"`
        ).join('\n');
        type = 'text/csv';
        extension = 'csv';
        break;
      case 'markdown':
        content = `# Links extracted on ${timestamp}\n\n` + links.map(link =>
          `- [${link.text}](${link.href})${link.isBacklink ? ' (Backlink)' : ''}`
        ).join('\n');
        type = 'text/markdown';
        extension = 'md';
        break;
      default:
        return;
    }

    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `links-${timestamp}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const addCategory = (linkId, category) => {
    // Add category logic
  }

  const toggleFavorite = async (href) => {
    setFavorites(prev => {
      const newFavorites = prev.includes(href)
        ? prev.filter(link => link !== href)
        : [...prev, href];
      
      // Save to chrome storage
      chrome.storage.sync.set({ favorites: newFavorites });
      return newFavorites;
    });
  };

  const searchLinks = (links) => {
    return links.filter(link => 
      link.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      link.href.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  
  // Save history of collected links
  const saveToHistory = async () => {
    const existingHistory = await chrome.storage.sync.get('linkHistory')
    const newHistory = {
      ...existingHistory,
      [Date.now()]: links
    }
    await chrome.storage.sync.set({ linkHistory: newHistory })
  }

  // Check if links are still valid
  const validateLink = async (url) => {
    try {
      const response = await fetch(url, { method: 'HEAD' })
      return response.ok
    } catch (error) {
      return false
    }
  }

  const addToCollection = (collectionName, links) => {
    setCollections(prev => ({
      ...prev,
      [collectionName]: [...(prev[collectionName] || []), ...links]
    }))
  }

  const updateStats = (links) => {
    // Calculate statistics
  }

  // Add preview functionality to links
  const capturePreview = async (url) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = `https://api.screenshotmachine.com?key=YOUR_API_KEY&url=${url}`;
    return new Promise((resolve) => {
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL());
      };
    });
  };

  const categorizeLinks = async (links) => {
    const categories = await fetch('your-ai-endpoint', {
      method: 'POST',
      body: JSON.stringify({ links }),
    }).then(res => res.json());
    
    return links.map((link, i) => ({
      ...link,
      category: categories[i],
    }));
  };

  const checkAndArchiveLink = async (url) => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (!response.ok) {
        // Archive using Wayback Machine
        const archiveUrl = `https://web.archive.org/save/${url}`;
        return archiveUrl;
      }
      return url;
    } catch (error) {
      console.error('Link is dead:', error);
    }
  };

  const shareCollection = async (collectionId, email) => {
    // Generate shareable link
    const shareableLink = await chrome.runtime.sendMessage({
      type: 'GENERATE_SHARE_LINK',
      collectionId,
    });
    
    // Send invitation
    await sendInvitation(email, shareableLink);
  };

  useEffect(() => {
    chrome.storage.sync.get(['favorites'], (result) => {
      if (result.favorites) {
        setFavorites(result.favorites);
      }
    });
  }, []);

  return (
    <div className={`w-[600px] p-6 ${isDarkMode ? 'dark bg-gray-800' : 'bg-gray-50'}`}>
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Link Saver</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700"
          >
            {isDarkMode ? '🌞' : '🌙'}
          </button>
          <button
            onClick={saveToHistory}
            className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700"
            title="Save to History"
          >
            📥
          </button>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Links</h3>
          <p className="text-2xl font-bold dark:text-white">{links.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Domains</h3>
          <p className="text-2xl font-bold dark:text-white">
            {new Set(links.map(l => new URL(l.href).hostname)).size}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Dead Links {isCheckingLinks && '(Checking...)'}
          </h3>
          <p className="text-2xl font-bold text-red-500">
            {isCheckingLinks ? '...' : deadLinks.size}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-4 space-y-2">
        <input
          type="text"
          placeholder="Search links..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 rounded-lg border dark:bg-gray-700 dark:text-white"
        />
        <div className="flex gap-2">
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="p-2 rounded-lg border dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Links</option>
            <option value="backlinks">Backlinks</option>
            <option value="regular">Regular Links</option>
            <option value="favorites">Favorites</option>
          </select>
          <select 
            onChange={(e) => addToCollection(e.target.value, selectedLinks)}
            className="p-2 rounded-lg border dark:bg-gray-700 dark:text-white"
          >
            <option value="">Add to Collection</option>
            {Object.keys(collections).map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
            <option value="new">+ New Collection</option>
          </select>
        </div>
      </div>

      {/* Export Options */}
      <div className="flex gap-2 mb-4">
        <button onClick={downloadLinks} className="btn-primary">
          Export TXT
        </button>
        <button 
          onClick={() => exportLinks('json')} 
          className="btn-primary"
          disabled={isExporting}
        >
          {isExporting ? 'Exporting...' : 'Export JSON'}
        </button>
        <button onClick={() => exportLinks('csv')} className="btn-primary">
          Export CSV
        </button>
        <button onClick={() => exportLinks('markdown')} className="btn-primary">
          Export MD
        </button>
      </div>

      {/* Links Display */}
      <div className="bg-white dark:bg-gray-700 rounded-xl shadow-sm">
        <div className="p-4 border-b border-gray-200 dark:border-gray-600">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-700 dark:text-white">
              Found Links ({filteredAndSearchedLinks.length})
            </h2>
            <button 
              onClick={() => categorizeLinks(links)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Auto-Categorize
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-600 max-h-[400px] overflow-y-auto">
          {filteredAndSearchedLinks.map((link, index) => (
            <div 
              key={index} 
              className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors ${
                link.isBacklink ? 'bg-blue-50 dark:bg-blue-900' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Link Preview (if available) */}
                {link.preview && (
                  <img 
                    src={link.preview} 
                    alt="Preview" 
                    className="w-24 h-24 object-cover rounded"
                  />
                )}
                
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white mb-1">
                        {link.text || '(No text)'}
                      </p>
                      <a 
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 break-all"
                      >
                        {link.href}
                      </a>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => toggleFavorite(link.href)}
                        className="text-gray-400 hover:text-yellow-500"
                      >
                        {favorites.includes(link.href) ? '⭐' : '☆'}
                      </button>
                      <input 
                        type="checkbox"
                        checked={selectedLinks.includes(link.href)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLinks([...selectedLinks, link.href])
                          } else {
                            setSelectedLinks(selectedLinks.filter(l => l !== link.href))
                          }
                        }}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Tags and Status */}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {link.isBacklink && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        Backlink
                      </span>
                    )}
                    {link.category && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        {link.category}
                      </span>
                    )}
                    {link.archivedUrl && link.archivedUrl !== link.href && (
                      <a 
                        href={link.archivedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800"
                      >
                        Archived Version
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedLinks.length > 0 && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-700 p-4 rounded-lg shadow-lg flex gap-2">
          <button onClick={() => bulkActions.delete()} className="btn-danger">
            Delete ({selectedLinks.length})
          </button>
          <button onClick={() => bulkActions.export()} className="btn-primary">
            Export ({selectedLinks.length})
          </button>
          <button onClick={() => bulkActions.categorize()} className="btn-secondary">
            Categorize ({selectedLinks.length})
          </button>
        </div>
      )}

// Replace from line 517 to the end
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : links.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            No links found on this page or unable to access page content.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      ) : null}
    </div>
  )
}

export default App
