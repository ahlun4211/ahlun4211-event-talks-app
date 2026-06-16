# BigQuery Release Notes Explorer 🚀

A sleek, responsive web application that aggregates Google Cloud BigQuery release notes, parses updates by category, and allows you to easily share individual updates on X/Twitter in a single click. Built with a Python Flask backend and a modern vanilla HTML, CSS, and JS frontend.

---

## 🌟 Features

* **Real-time Sync**: Fetches the official Google Cloud BigQuery Atom feed dynamically.
* **Smart Update Categorization**: Segregates raw daily release HTML content into distinct cards grouped by type (Features, Changes, Issues, Deprecations) using BeautifulSoup.
* **Instant Filtering & Search**: Client-side filtering by category pills and text search queries (no page refreshes or extra API roundtrips).
* **X/Twitter Composer Integration**: Automatically prepares formatted draft tweets containing categories, dates, short descriptions, and official source links, using Twitter's Web Intent helper. It automatically trims text to fit under the 280-character limit with smart ellipsis truncation.
* **Premium Theme**: Styled with a dark glassmorphic interface, responsive sidebars, micro-animations, and interactive states.

---

## 📂 Project Structure

```
├── app.py                # Flask Backend (Feed fetching, XML and BeautifulSoup HTML parsing)
├── requirements.txt      # Python dependencies
├── .gitignore            # Git exclusion configuration
├── templates/
│   └── index.html        # Main HTML layout, structure, and widgets
└── static/
    ├── css/
    │   └── style.css     # CSS Variables, grid system, theme design, animations
    └── js/
        └── app.js        # State manager, search/filtering logic, Twitter integration
```

---

## 🛠️ Installation & Setup

### Prerequisites
Make sure you have Python 3 installed on your machine.

### 1. Clone & Navigate
Navigate into the project directory:
```bash
cd bq-releases-notes
```

### 2. Set Up Virtual Environment (Optional)
If you need to re-create or activate the virtual environment:
```bash
# Create venv if it doesn't exist
python3 -m venv venv

# Activate it (macOS/Linux)
source venv/bin/activate

# Activate it (Windows)
venv\Scripts\activate
```

### 3. Install Dependencies
Install the required packages from `requirements.txt`:
```bash
pip install -r requirements.txt
```

### 4. Run the Server
Launch the Flask development server:
```bash
python app.py
```
By default, the server runs on: **[http://localhost:8080](http://localhost:8080)**.

*(Note: Port `8080` is used to prevent port collision with macOS AirPlay services on port `5000`)*.

---

## 🔗 Architecture Details

### Backend Feed Parsing
The backend ([app.py](file:///Users/ahlun4211/agy-cli-projects/bq-releases-notes/app.py)) queries the official XML Feed. Because Google groups multiple releases within a single feed item's HTML body, Flask parses the HTML CDATA content and splits it using `<h3>` tags as partition markers. Each group is parsed into plain-text and structured HTML, then returned as JSON to the client.

### Client Filtering & Tweeting
The frontend ([app.js](file:///Users/ahlun4211/agy-cli-projects/bq-releases-notes/static/js/app.js)) stores the fetched entries in a local state array. Typing inside the search bar or clicking any type pill applies immediate filtering logic to the array and re-renders the timeline. Clicking on a card populates the composer, where characters are dynamically counted, text is auto-formatted, and X sharing is initialized.
