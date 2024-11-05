import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get current tab and extract links
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

  const saveLinks = async () => {
    try {
      await chrome.storage.local.set({ 
        savedLinks: links 
      })
      alert('Links saved successfully!')
    } catch (error) {
      console.error('Error saving links:', error)
      alert('Error saving links')
    }
  }

  return (
    <div className="app">
      <h1>Link Saver</h1>
      
      {loading ? (
        <p>Loading links...</p>
      ) : (
        <>
          <button onClick={saveLinks}>Save All Links</button>
          
          <div className="links-container">
            <h2>Found Links ({links.length})</h2>
            {links.map((link, index) => (
              <div key={index} className={`link-item ${link.isBacklink ? 'backlink' : ''}`}>
                <span className="link-text">{link.text}</span>
                <a href={link.href} target="_blank" rel="noopener noreferrer">
                  {link.href}
                </a>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default App