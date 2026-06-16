// Global Application State
let appState = {
    releases: [],
    filteredReleases: [],
    selectedUpdate: null,
    searchQuery: '',
    selectedType: 'all',
    isLoading: false
};

// DOM Elements
const refreshBtn = document.getElementById('refresh-btn');
const iconRefresh = refreshBtn.querySelector('.icon-refresh');
const exportCsvBtn = document.getElementById('export-csv-btn');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const iconSun = themeToggleBtn.querySelector('.icon-sun');
const iconMoon = themeToggleBtn.querySelector('.icon-moon');
const themeToggleText = themeToggleBtn.querySelector('.btn-text');
const iconSpinner = refreshBtn.querySelector('.icon-spinner');
const searchInput = document.getElementById('search-input');
const searchClearBtn = document.getElementById('search-clear-btn');
const filterPills = document.querySelectorAll('.pill');
const feedContainer = document.getElementById('feed-container');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const retryBtn = document.getElementById('retry-btn');

// Stats DOM Elements
const statTotal = document.getElementById('stat-total');
const statFeatures = document.getElementById('stat-features');
const statusText = document.getElementById('status-text');
const statusDot = document.querySelector('.status-dot');
const resultsCount = document.getElementById('results-count');

// Composer DOM Elements
const composerCard = document.getElementById('tweet-composer-card');
const composerEmpty = document.getElementById('composer-empty');
const composerForm = document.getElementById('composer-form');
const previewBadge = document.getElementById('preview-badge');
const previewDate = document.getElementById('preview-date');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCount = document.getElementById('char-count');
const originalUpdateText = document.getElementById('original-update-text');
const tweetBtn = document.getElementById('tweet-btn');
const composerCloseBtn = document.getElementById('composer-close-btn');

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    initTheme();
    fetchReleaseNotes();
});

// Event Listeners Setup
function setupEventListeners() {
    refreshBtn.addEventListener('click', fetchReleaseNotes);
    retryBtn.addEventListener('click', fetchReleaseNotes);
    exportCsvBtn.addEventListener('click', exportToCSV);
    themeToggleBtn.addEventListener('click', toggleTheme);
    
    // Search input filtering
    searchInput.addEventListener('input', (e) => {
        appState.searchQuery = e.target.value.toLowerCase();
        toggleSearchClearBtn();
        applyFiltersAndRender();
    });

    // Clear search button
    searchClearBtn.addEventListener('click', () => {
        searchInput.value = '';
        appState.searchQuery = '';
        toggleSearchClearBtn();
        applyFiltersAndRender();
        searchInput.focus();
    });

    // Type pills filtering
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            
            appState.selectedType = pill.getAttribute('data-type');
            applyFiltersAndRender();
        });
    });

    // Close composer
    composerCloseBtn.addEventListener('click', deselectUpdate);

    // Tweet text area character counter
    tweetTextarea.addEventListener('input', updateCharacterCount);

    // Share Tweet Button
    tweetBtn.addEventListener('click', shareOnTwitter);
}

// Fetch notes from Flask API
async function fetchReleaseNotes() {
    if (appState.isLoading) return;
    
    setLoadingState(true);
    updateStatus('Syncing notes...', 'orange');
    
    try {
        const response = await fetch('/api/releases');
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Server error fetching release notes');
        }
        
        const data = await response.json();
        
        if (data.success) {
            appState.releases = data.entries;
            deselectUpdate(); // Reset selected update on fresh fetch
            applyFiltersAndRender();
            calculateStats();
            updateStatus('Synced successfully', 'green');
            showToast('Release notes updated!');
        } else {
            throw new Error(data.error || 'Unknown error occurred');
        }
    } catch (error) {
        console.error('Error loading notes:', error);
        showError(error.message);
        updateStatus('Sync failed', 'orange');
    } finally {
        setLoadingState(false);
    }
}

// Show loading indicator
function setLoadingState(loading) {
    appState.isLoading = loading;
    if (loading) {
        refreshBtn.disabled = true;
        iconRefresh.classList.add('hidden');
        iconSpinner.classList.remove('hidden');
        if (appState.releases.length === 0) {
            loadingState.classList.remove('hidden');
            feedContainer.classList.add('hidden');
            errorState.classList.add('hidden');
        }
    } else {
        refreshBtn.disabled = false;
        iconRefresh.classList.remove('hidden');
        iconSpinner.classList.add('hidden');
        loadingState.classList.add('hidden');
    }
}

// Show Error Panel
function showError(message) {
    errorMessage.textContent = message;
    errorState.classList.remove('hidden');
    feedContainer.classList.add('hidden');
    loadingState.classList.add('hidden');
}

// Update bottom-left status text and dot
function updateStatus(text, colorClass) {
    statusText.textContent = text;
    statusDot.className = 'status-dot ' + colorClass;
}

// Calculate feed statistics
function calculateStats() {
    let totalItems = 0;
    let totalFeatures = 0;
    
    appState.releases.forEach(entry => {
        if (entry.updates && entry.updates.length) {
            totalItems += entry.updates.length;
            entry.updates.forEach(u => {
                if (u.type.toLowerCase() === 'feature') {
                    totalFeatures++;
                }
            });
        }
    });
    
    statTotal.textContent = totalItems;
    statFeatures.textContent = totalFeatures;
}

// Filter releases based on search query and selected update type
function applyFiltersAndRender() {
    errorState.classList.add('hidden');
    
    const filteredEntries = [];
    let matchCount = 0;
    
    appState.releases.forEach(entry => {
        const filteredUpdates = entry.updates.filter(update => {
            // Filter by Type
            const typeMatch = appState.selectedType === 'all' || 
                              update.type.toLowerCase() === appState.selectedType.toLowerCase();
            
            // Filter by Search Query
            const searchMatch = !appState.searchQuery || 
                                update.text.toLowerCase().includes(appState.searchQuery) ||
                                update.type.toLowerCase().includes(appState.searchQuery) ||
                                entry.date.toLowerCase().includes(appState.searchQuery);
                                
            return typeMatch && searchMatch;
        });
        
        if (filteredUpdates.length > 0) {
            filteredEntries.push({
                ...entry,
                updates: filteredUpdates
            });
            matchCount += filteredUpdates.length;
        }
    });
    
    appState.filteredReleases = filteredEntries;
    
    // Update count labels
    if (appState.searchQuery || appState.selectedType !== 'all') {
        resultsCount.textContent = `Found ${matchCount} match${matchCount !== 1 ? 'es' : ''}`;
    } else {
        resultsCount.textContent = `Showing all ${matchCount} updates`;
    }
    
    renderTimeline();
}

// Render release entries on timeline
function renderTimeline() {
    feedContainer.innerHTML = '';
    
    if (appState.filteredReleases.length === 0) {
        feedContainer.classList.remove('hidden');
        feedContainer.innerHTML = `
            <div class="composer-empty-state">
                <div class="empty-icon">📂</div>
                <h3>No Updates Found</h3>
                <p>Try modifying your search query or filter settings.</p>
            </div>
        `;
        return;
    }
    
    feedContainer.classList.remove('hidden');
    
    appState.filteredReleases.forEach(entry => {
        // Create date group element
        const dateGroup = document.createElement('div');
        dateGroup.className = 'date-group';
        
        // Date Header
        const dateHeader = document.createElement('div');
        dateHeader.className = 'date-header';
        dateHeader.innerHTML = `<h3>${entry.date}</h3>`;
        dateGroup.appendChild(dateHeader);
        
        // Render each update under this date
        entry.updates.forEach((update, idx) => {
            const uniqueId = `${entry.date}_${idx}`;
            const isSelected = appState.selectedUpdate && appState.selectedUpdate.id === uniqueId;
            
            const card = document.createElement('article');
            card.className = `update-card ${isSelected ? 'selected' : ''}`;
            card.setAttribute('data-type', update.type);
            card.setAttribute('data-id', uniqueId);
            
            card.innerHTML = `
                <div class="card-header">
                    <span class="card-type-badge">${update.type}</span>
                    <div class="card-actions">
                        <button class="action-btn btn-compose" title="Draft Tweet about this update">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 20h9"></path>
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                            </svg>
                        </button>
                        <button class="action-btn btn-copy" title="Copy text to clipboard">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        </button>
                        <a href="${entry.link}" target="_blank" class="action-btn" title="Open official notes page">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                <polyline points="15 3 21 3 21 9"></polyline>
                                <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                        </a>
                    </div>
                </div>
                <div class="card-body">
                    ${update.html}
                </div>
            `;
            
            // Add click events
            card.addEventListener('click', (e) => {
                // If they clicked the copy button or external link, don't trigger selection
                if (e.target.closest('.action-btn') || e.target.closest('a')) {
                    return;
                }
                selectUpdate(update, entry, uniqueId);
            });
            
            // Clipboard Copy implementation
            const copyBtn = card.querySelector('.btn-copy');
            copyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                copyTextToClipboard(update.text);
            });

            // Compose Tweet implementation
            const composeBtn = card.querySelector('.btn-compose');
            composeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                selectUpdate(update, entry, uniqueId);
            });
            
            dateGroup.appendChild(card);
        });
        
        feedContainer.appendChild(dateGroup);
    });
}

// Select an update card and fill the composer
function selectUpdate(update, entry, uniqueId) {
    appState.selectedUpdate = {
        id: uniqueId,
        update: update,
        entry: entry
    };
    
    // Update card styles
    document.querySelectorAll('.update-card').forEach(card => {
        card.classList.remove('selected');
        if (card.getAttribute('data-id') === uniqueId) {
            card.classList.add('selected');
        }
    });
    
    // Fill composer
    composerEmpty.classList.add('hidden');
    composerForm.classList.remove('hidden');
    
    // Update preview details
    previewBadge.textContent = update.type;
    previewBadge.className = `composer-badge ${update.type.toLowerCase()}`;
    previewDate.textContent = entry.date;
    originalUpdateText.textContent = update.text;
    
    // Generate draft tweet text
    tweetTextarea.value = generateDefaultTweet(entry.date, update.type, update.text, entry.link);
    updateCharacterCount();
    
    // For smaller screens, slide up the panel
    document.querySelector('.app-composer').classList.add('open');
}

// Deselect / Close composer
function deselectUpdate() {
    appState.selectedUpdate = null;
    document.querySelectorAll('.update-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    composerEmpty.classList.remove('hidden');
    composerForm.classList.add('hidden');
    
    // Slide down composer on mobile
    document.querySelector('.app-composer').classList.remove('open');
}

// Smart Tweet Generator (fitting inside 280 chars)
function generateDefaultTweet(date, type, text, link) {
    const prefix = `BigQuery ${type} (${date}): `;
    const suffix = ` #BigQuery #GCP`;
    
    let linkPart = '';
    if (link) {
        linkPart = `\n\nNotes: ${link}`;
    }
    
    // Total character budget
    const budget = 280 - prefix.length - linkPart.length - suffix.length;
    
    let trimmedText = text;
    if (trimmedText.length > budget) {
        trimmedText = trimmedText.substring(0, budget - 3) + '...';
    }
    
    return `${prefix}${trimmedText}${linkPart}${suffix}`;
}

// Update character counter and styles
function updateCharacterCount() {
    const length = tweetTextarea.value.length;
    charCount.textContent = length;
    
    const counterElement = charCount.parentElement;
    counterElement.className = 'character-counter';
    
    if (length > 280) {
        counterElement.classList.add('danger');
        tweetBtn.disabled = true;
        tweetBtn.style.opacity = '0.5';
    } else {
        tweetBtn.disabled = false;
        tweetBtn.style.opacity = '1';
        if (length > 250) {
            counterElement.classList.add('warning');
        }
    }
}

// Copy to clipboard helper
function copyTextToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Copied to clipboard!');
        }, (err) => {
            console.error('Clipboard copy failed: ', err);
        });
    } else {
        // Fallback
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";  // Avoid scrolling to bottom
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            showToast('Copied to clipboard!');
        } catch (err) {
            console.error('Fallback copy failed: ', err);
        }
        document.body.removeChild(textArea);
    }
}

// Open Twitter web intent
function shareOnTwitter() {
    const tweetText = tweetTextarea.value;
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=550,height=420');
}

// Export current updates to CSV
function exportToCSV() {
    if (appState.filteredReleases.length === 0) {
        showToast('No updates to export!');
        return;
    }
    
    const rows = [['Date', 'Type', 'Update Text', 'Link']];
    
    appState.filteredReleases.forEach(entry => {
        entry.updates.forEach(update => {
            rows.push([
                entry.date,
                update.type,
                update.text,
                entry.link
            ]);
        });
    });
    
    const csvContent = rows.map(row => 
        row.map(field => `"${(field || '').replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `bigquery_release_notes_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('CSV Exported!');
}

// Theme toggle logic
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        iconSun.classList.add('hidden');
        iconMoon.classList.remove('hidden');
        themeToggleText.textContent = 'Dark Mode';
    } else {
        document.body.classList.remove('light-mode');
        iconSun.classList.remove('hidden');
        iconMoon.classList.add('hidden');
        themeToggleText.textContent = 'Light Mode';
    }
}

function toggleTheme() {
    const isLight = document.body.classList.toggle('light-mode');
    if (isLight) {
        localStorage.setItem('theme', 'light');
        iconSun.classList.add('hidden');
        iconMoon.classList.remove('hidden');
        themeToggleText.textContent = 'Dark Mode';
        showToast('Light theme activated!');
    } else {
        localStorage.setItem('theme', 'dark');
        iconSun.classList.remove('hidden');
        iconMoon.classList.add('hidden');
        themeToggleText.textContent = 'Light Mode';
        showToast('Dark theme activated!');
    }
}

// Toggle search clear button visibility
function toggleSearchClearBtn() {
    if (appState.searchQuery) {
        searchClearBtn.classList.remove('hidden');
    } else {
        searchClearBtn.classList.add('hidden');
    }
}

// Custom Toast notification
function showToast(message) {
    // Check if toast already exists
    let toast = document.querySelector('.toast-notification');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast-notification';
        document.body.appendChild(toast);
    }
    
    toast.innerHTML = `
        <span class="toast-success-icon">✓</span>
        <span>${message}</span>
    `;
    
    toast.classList.add('show');
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
