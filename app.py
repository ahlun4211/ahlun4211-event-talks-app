import logging
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template
import requests
from bs4 import BeautifulSoup

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

NAMESPACE = {'atom': 'http://www.w3.org/2005/Atom'}
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def parse_content_html(content_html):
    """
    Parses the CDATA HTML content from the feed.
    Groups updates by the <h3> tag, which specifies the update type (e.g., Feature, Issue, Change, Deprecation).
    """
    if not content_html:
        return []
        
    soup = BeautifulSoup(content_html, 'html.parser')
    updates = []
    
    current_type = None
    current_elements = []
    
    # Iterate through child nodes in the soup to split by <h3> elements
    for child in soup.contents:
        if child.name == 'h3':
            # Save the previous update if it exists
            if current_type is not None:
                html_content = "".join(str(e) for e in current_elements)
                text_content = BeautifulSoup(html_content, 'html.parser').get_text(separator=' ').strip()
                updates.append({
                    'type': current_type,
                    'html': html_content,
                    'text': text_content
                })
                current_elements = []
            current_type = child.get_text().strip()
        else:
            if current_type is None:
                # Handle text/elements before the first <h3> header
                if str(child).strip():
                    current_type = "Update"
                    current_elements.append(child)
            else:
                current_elements.append(child)
                
    # Save the last update
    if current_type is not None:
        html_content = "".join(str(e) for e in current_elements)
        text_content = BeautifulSoup(html_content, 'html.parser').get_text(separator=' ').strip()
        updates.append({
            'type': current_type,
            'html': html_content,
            'text': text_content
        })
        
    return updates

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    try:
        logging.info(f"Fetching release notes from {FEED_URL}")
        response = requests.get(FEED_URL, timeout=15)
        response.raise_for_status()
        
        logging.info("Parsing XML feed")
        root = ET.fromstring(response.content)
        
        entries = []
        for entry in root.findall('atom:entry', NAMESPACE):
            title_el = entry.find('atom:title', NAMESPACE)
            updated_el = entry.find('atom:updated', NAMESPACE)
            id_el = entry.find('atom:id', NAMESPACE)
            link_el = entry.find('atom:link[@rel="alternate"]', NAMESPACE)
            if link_el is None:
                link_el = entry.find('atom:link', NAMESPACE)
            content_el = entry.find('atom:content', NAMESPACE)
            
            title = title_el.text if title_el is not None else "Unknown Date"
            updated = updated_el.text if updated_el is not None else ""
            entry_id = id_el.text if id_el is not None else ""
            link = link_el.attrib.get('href', '') if link_el is not None else ""
            content_html = content_el.text if content_el is not None else ""
            
            updates = parse_content_html(content_html)
            
            entries.append({
                'date': title,
                'updated': updated,
                'id': entry_id,
                'link': link,
                'updates': updates
            })
            
        return jsonify({
            'success': True,
            'entries': entries
        })
    except requests.exceptions.RequestException as e:
        logging.error(f"Network error while fetching feed: {e}")
        return jsonify({
            'success': False,
            'error': f"Failed to fetch release notes: Network error ({str(e)})"
        }), 502
    except ET.ParseError as e:
        logging.error(f"XML parsing error: {e}")
        return jsonify({
            'success': False,
            'error': f"Failed to parse release notes: Invalid XML feed format ({str(e)})"
        }), 500
    except Exception as e:
        logging.error(f"Unexpected error: {e}")
        return jsonify({
            'success': False,
            'error': f"An unexpected error occurred: {str(e)}"
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8080)
