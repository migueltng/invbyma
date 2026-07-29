const axios = require('axios');
const xml2js = require('xml2js');

const FEEDS = {
  investing: {
    name: 'Investing.com',
    urls: [
      'https://www.investing.com/rss/news.rss',
      'https://www.investing.com/rss/news_25.rss',
      'https://www.investing.com/rss/news_301.rss'
    ]
  },
  marketwatch: {
    name: 'MarketWatch',
    urls: [
      'http://feeds.marketwatch.com/marketwatch/topstories/',
      'http://feeds.marketwatch.com/marketwatch/marketpulse/',
      'http://feeds.marketwatch.com/marketwatch/StockstoWatch/'
    ]
  },
  cnbc: {
    name: 'CNBC',
    urls: [
      'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10001147',
      'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114',
      'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=15839069'
    ]
  },
  benzinga: {
    name: 'Benzinga',
    urls: [
      'https://feeds.benzinga.com/benzinga',
      'https://feeds.benzinga.com/benzinga/news'
    ]
  },
  yahoo_finance: {
    name: 'Yahoo Finance',
    urls: [
      'https://finance.yahoo.com/news/rssindex'
    ]
  },
  reuters: {
    name: 'Reuters',
    urls: [
      'https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best'
    ]
  },
  seekingalpha: {
    name: 'Seeking Alpha',
    urls: [
      'https://seekingalpha.com/market_currents.xml',
      'https://seekingalpha.com/feed.xml'
    ]
  },
  motleyfool: {
    name: 'Motley Fool',
    urls: [
      'https://www.fool.com/rss/market-beat/',
      'https://www.fool.com/rss/index/'
    ]
  },
  nasdaq: {
    name: 'Nasdaq',
    urls: [
      'https://www.nasdaq.com/feed/rssoutbound?category=Markets'
    ]
  }
};

const SYMBOL_MAP = {
  'GGAL': ['GALICIA', 'BANCO GALICIA', 'GRUPO GALICIA', 'GRUPO FINANCIERO GALICIA'],
  'YPF': ['YPF', 'YPF SA'],
  'YPFD': ['YPF', 'YPF SA'],
  'PAMP': ['PAMPA ENERGIA', 'PAMPA'],
  'TXAR': ['TERNIUM', 'TERNIUM ARGENTINA'],
  'ALUA': ['ALUAR', 'ALUMINAS ARGENTINAS'],
  'SUPV': ['SUPERVIELLE', 'BANCO SUPERVIELLE'],
  'BMA': ['BANCO MACRO', 'MACRO'],
  'BBAR': ['BBVA', 'BBVA ARGENTINA', 'BBVA BANCO FRANCES'],
  'VALO': ['VALORES', 'GRUPO VALORES'],
  'CRES': ['CRESCED'],
  'EDN': ['EDENOR', 'DISTRIBUIDORA DE ENERGIA NORDESTE'],
  'TECO2': ['TECNOLOGIA ARGENTINA', 'TECO'],
  'MIRG': ['MIRGOR'],
  'COME': ['COMERCIAL DEL PLATA'],
  'BYMA': ['BYMA', 'BOLSA DE VALORES DE BUENOS AIRES'],
  'LOMA': ['LOMA NEGRA'],
  'TRAN': ['TRANSENER'],
  'BHIP': ['BANCO HIPOTECARIO'],
  'BPAT': ['BANCO PATAGONIA'],
  'RICH': ['RICHMOND', 'RICHMOND PHARMA'],
  'CEPU': ['CENTRAL PUERTO'],
  'TGNO4': ['TRANSENERGIA'],
  'TGSU2': ['TGS', 'TRANSPORTE DE GAS DEL SUR'],
  'BPOP': ['BANCO POPULAR'],
  'SEMI': ['SEMILLER'],
  'MORI': ['MORI'],
  'RIGO': ['RIGOL'],
  'RSEU': ['ROUSSEAU'],
  'SAMI': ['SAMI'],

  'AAPL': ['APPLE', 'APPLE INC'],
  'MSFT': ['MICROSOFT', 'MICROSOFT CORPORATION'],
  'GOOGL': ['GOOGLE', 'ALPHABET', 'ALPHABET INC'],
  'GOOG': ['GOOGLE', 'ALPHABET'],
  'AMZN': ['AMAZON', 'AMAZON.COM', 'AMAZON WEB SERVICES', 'AWS'],
  'TSLA': ['TESLA', 'TESLA INC', 'TESLA MOTORS'],
  'NVDA': ['NVIDIA', 'NVIDIA CORPORATION'],
  'META': ['META', 'FACEBOOK', 'META PLATFORMS'],
  'NFLX': ['NETFLIX', 'NETFLIX INC'],
  'JPM': ['JP MORGAN', 'JPMORGAN CHASE', 'JPMORGAN'],
  'V': ['VISA', 'VISA INC'],
  'BABA': ['ALIBABA', 'ALIBABA GROUP'],
  'BRK': ['BERKSHIRE', 'BERKSHIRE HATHAWAY', 'WARREN BUFFETT'],
  'JNJ': ['JOHNSON', 'JOHNSON & JOHNSON', 'J&J'],
  'WMT': ['WALMART', 'WALMART INC'],
  'PG': ['PROCTER', 'GAMBLE', 'PROCTER & GAMBLE', 'P&G'],
  'XOM': ['EXXON', 'EXXONMOBIL', 'EXXON MOBIL'],
  'CVX': ['CHEVRON', 'CHEVRON CORPORATION'],
  'WFC': ['WELLS FARGO'],
  'DIS': ['DISNEY', 'WALT DISNEY', 'WALT DISNEY COMPANY'],
  'BAC': ['BANK OF AMERICA'],
  'CSCO': ['CISCO', 'CISCO SYSTEMS'],
  'VZ': ['VERIZON', 'VERIZON COMMUNICATIONS'],
  'T': ['AT&T', 'AT AND T'],
  'INTC': ['INTEL', 'INTEL CORPORATION'],
  'KO': ['COCA COLA', 'COCA-COLA', 'THE COCA-COLA COMPANY'],
  'PEP': ['PEPSICO', 'PEPSICO INC'],
  'NKE': ['NIKE', 'NIKE INC'],
  'MRK': ['MERCK', 'MERCK & CO'],
  'PFE': ['PFIZER', 'PFIZER INC'],
  'ABT': ['ABBOTT', 'ABBOTT LABORATORIES'],
  'CRM': ['SALESFORCE', 'SALESFORCE INC'],
  'AMD': ['AMD', 'ADVANCED MICRO DEVICES'],
  'COST': ['COSTCO', 'COSTCO WHOLESALE'],
  'BA': ['BOEING', 'BOEING COMPANY'],
  'GS': ['GOLDMAN SACHS', 'GOLDMAN SACHS GROUP'],
  'MS': ['MORGAN STANLEY'],
  'BLK': ['BLACKROCK', 'BLACKROCK INC'],
  'SCHW': ['SCHWAB', 'CHARLES SCHWAB'],
  'AXP': ['AMERICAN EXPRESS', 'AMEX'],
  'USB': ['US BANCORP', 'US BANK'],
  'PNC': ['PNC', 'PNC FINANCIAL'],
  'TGT': ['TARGET', 'TARGET CORPORATION'],
  'LOW': ['LOWE\'S', 'LOWES'],
  'HD': ['HOME DEPOT', 'THE HOME DEPOT'],
  'MCD': ['MCDONALD\'S', 'MCDONALDS'],
  'SBUX': ['STARBUCKS', 'STARBUCKS CORPORATION'],
  'YUM': ['YUM BRANDS', 'YUM! BRANDS'],
  'MAR': ['MARRIOTT', 'MARRIOTT INTERNATIONAL'],
  'HLT': ['HILTON', 'HILTON WORLDWIDE'],
  'CL': ['COLGATE', 'COLGATE-PALMOLIVE'],
  'KMB': ['KIMBERLY CLARK', 'KIMBERLY-CLARK'],
  'GIS': ['GENERAL MILLS'],
  'K': ['KELLOGG', 'KELLOGG COMPANY'],
  'MNST': ['MONSTER', 'MONSTER BEVERAGE', 'MONSTER ENERGY'],
  'STZ': ['CONSTELLATION BRANDS'],
  'CAG': ['CONAGRA', 'CONAGRA BRANDS'],
  'HSY': ['HERSHEY', 'HERSHEY COMPANY'],

  'MGM': ['MGM', 'MGM RESORTS'],
  'LVS': ['LAS VEGAS SANDS'],
  'WYNN': ['WYNN', 'WYNN RESORTS'],
  'CZR': ['CAESARS', 'CAESARS ENTERTAINMENT'],
  'PENN': ['PENN ENTERTAINMENT', 'PENN NATIONAL'],
  'DKNG': ['DRAFTKINGS', 'DRAFTKINGS INC'],

  'ROKU': ['ROKU', 'ROKU INC'],
  'SNAP': ['SNAP', 'SNAPCHAT', 'SNAP INC'],
  'PINS': ['PINTEREST', 'PINTEREST INC'],
  'SPOT': ['SPOTIFY', 'SPOTIFY TECHNOLOGY'],
  'SQ': ['SQUARE', 'BLOCK', 'BLOCK INC'],
  'SHOP': ['SHOPIFY', 'SHOPIFY INC'],
  'ZM': ['ZOOM', 'ZOOM VIDEO COMMUNICATIONS'],
  'PTON': ['PELOTON', 'PELOTON INTERACTIVE'],
  'BYND': ['BEYOND MEAT'],
  'RIVN': ['RIVIAN', 'RIVIAN AUTOMOTIVE'],
  'LCID': ['LUCID', 'LUCID MOTORS', 'LUCID GROUP'],
  'NIO': ['NIO', 'NIO INC'],
  'XPEV': ['XPENG', 'XPENG MOTORS'],
  'LI': ['LI AUTO'],

  'TSMC': ['TSMC', 'TAIWAN SEMICONDUCTOR'],
  'ASML': ['ASML', 'ASML HOLDING'],
  'AVGO': ['BROADCOM', 'BROADCOM INC'],
  'QCOM': ['QUALCOMM', 'QUALCOMM INCORPORATED'],
  'TXN': ['TEXAS INSTRUMENTS'],
  'ADI': ['ANALOG DEVICES'],
  'MU': ['MICRON', 'MICRON TECHNOLOGY'],
  'INTU': ['INTUIT', 'QUICKBOOKS', 'TURBOTAX'],
  'ADBE': ['ADOBE', 'ADOBE INC', 'ADOBE SYSTEMS', 'PHOTOSHOP'],
  'NOW': ['SERVICENOW', 'SERVICE NOW'],
  'SNPS': ['SYNOPSYS'],
  'CDNS': ['CADENCE', 'CADENCE DESIGN'],
  'AMAT': ['APPLIED MATERIALS'],
  'LRCX': ['LAM RESEARCH'],
  'KLAC': ['KLA', 'KLA CORPORATION'],
  'MRVL': ['MARVELL', 'MARVELL TECHNOLOGY'],
  'FTNT': ['FORTINET', 'FORTIGUARD'],
  'PANW': ['PALO ALTO NETWORKS', 'PALO ALTO'],
  'CRWD': ['CROWDSTRIKE', 'CROWDSTRIKE FALCON'],
  'ZS': ['ZSCALER'],
  'DELL': ['DELL', 'DELL TECHNOLOGIES'],
  'HPQ': ['HP', 'HEWLETT PACKARD'],
  'IBM': ['IBM', 'INTERNATIONAL BUSINESS MACHINES'],
  'ORCL': ['ORACLE', 'ORACLE CORPORATION', 'ORACLE CLOUD'],
  'SAP': ['SAP', 'SAP SE'],

  'UBER': ['UBER', 'UBER TECHNOLOGIES', 'UBER EATS'],
  'LYFT': ['LYFT', 'LYFT INC'],
  'ABNB': ['AIRBNB', 'AIRBNB INC'],
  'COIN': ['COINBASE', 'COINBASE GLOBAL'],
  'HOOD': ['ROBINHOOD', 'ROBINHOOD MARKETS'],
  'SOFI': ['SOFI', 'SOCIAL FINANCE', 'SOFI TECHNOLOGIES'],
  'PYPL': ['PAYPAL', 'PAYPAL HOLDINGS'],
  'ADP': ['ADP', 'AUTOMATIC DATA PROCESSING'],

  'ISRG': ['INTUITIVE SURGICAL', 'DA VINCI'],
  'DXCM': ['DEXCOM', 'DEXCOM G7'],
  'BSX': ['BOSTON SCIENTIFIC'],
  'MDT': ['MEDTRONIC'],
  'SYK': ['STRYKER'],
  'ZBH': ['ZIMMER BIOMET'],
  'EW': ['EDWARDS LIFESCIENCES'],
  'GILD': ['GILEAD', 'GILEAD SCIENCES'],
  'AMGN': ['AMGEN'],
  'BIIB': ['BIOGEN'],
  'REGN': ['REGENERON'],
  'VRTX': ['VERTEX', 'VERTEX PHARMACEUTICALS'],
  'MRNA': ['MODERNA', 'MODERNA INC'],
  'BNTX': ['BIONTECH'],
  'TMO': ['THERMO FISHER', 'THERMO FISHER SCIENTIFIC'],
  'A': ['AGILENT', 'AGILENT TECHNOLOGIES'],
  'DHR': ['DANAHER'],
  'IDXX': ['IDEXX', 'IDEXX LABORATORIES'],
  'ALGN': ['ALIGN', 'ALIGN TECHNOLOGY'],
  'INCY': ['INCYTE'],
  'SGEN': ['SEAGEN'],
  'BMRN': ['BIOMARIN'],
  'ALNY': ['ALNYLAM'],
  'EXAS': ['EXACT SCIENCES'],

  'OXY': ['OCCIDENTAL', 'OCCIDENTAL PETROLEUM'],
  'MPC': ['MARATHON PETROLEUM'],
  'PSX': ['PHILLIPS 66'],
  'VLO': ['VALERO', 'VALERO ENERGY'],
  'WMB': ['WILLIAMS', 'WILLIAMS COMPANIES'],
  'KMI': ['KINDER MORGAN'],
  'OKE': ['ONEOK'],
  'HES': ['HESS', 'HESS CORPORATION'],
  'DVN': ['DEVON ENERGY'],
  'EOG': ['EOG', 'EOG RESOURCES'],
  'COP': ['CONOCOPHILLIPS'],
  'SLB': ['SCHLUMBERGER', 'SLB'],
  'HAL': ['HALLIBURTON'],
  'BKR': ['BAKER HUGHES'],

  'SO': ['SOUTHERN', 'SOUTHERN COMPANY'],
  'DUK': ['DUKE', 'DUKE ENERGY'],
  'D': ['DOMINION', 'DOMINION ENERGY'],
  'AEP': ['AMERICAN ELECTRIC POWER', 'AEP'],
  'SRE': ['SEMPRA', 'SEMPRA ENERGY'],
  'EXC': ['EXELON'],
  'NEE': ['NEXTERA', 'NEXTERA ENERGY'],
  'PCG': ['PG&E', 'PACIFIC GAS'],
  'XEL': ['XCEL', 'XCEL ENERGY'],

  'GE': ['GENERAL ELECTRIC', 'GE AEROSPACE'],
  'HON': ['HONEYWELL', 'HONEYWELL INTERNATIONAL'],
  'UNP': ['UNION PACIFIC'],
  'CAT': ['CATERPILLAR', 'CAT'],
  'DE': ['DEERE', 'JOHN DEERE'],
  'MMM': ['3M', '3M COMPANY'],
  'RTX': ['RAYTHEON', 'RAYTHEON TECHNOLOGIES', 'RTX'],
  'LMT': ['LOCKHEED MARTIN'],
  'NOC': ['NORTHROP GRUMMAN'],
  'GD': ['GENERAL DYNAMICS'],

  'IP': ['INTERNATIONAL PAPER'],
  'ETN': ['EATON', 'EATON CORPORATION'],
  'ITW': ['ILLINOIS TOOL WORKS', 'ITW'],
  'EMR': ['EMERSON', 'EMERSON ELECTRIC'],
  'CMI': ['CUMMINS'],

  'UPS': ['UPS', 'UNITED PARCEL SERVICE'],
  'FDX': ['FEDEX', 'FEDEX CORPORATION'],
  'DAL': ['DELTA', 'DELTA AIR LINES'],
  'UAL': ['UNITED AIRLINES'],
  'AAL': ['AMERICAN AIRLINES'],
  'LUV': ['SOUTHWEST', 'SOUTHWEST AIRLINES'],

  'GM': ['GENERAL MOTORS', 'GM'],
  'F': ['FORD', 'FORD MOTOR'],
  'TM': ['TOYOTA', 'TOYOTA MOTOR'],
  'HMC': ['HONDA', 'HONDA MOTOR'],
  'NSANY': ['NISSAN', 'NISSAN MOTOR'],
  'VWAGY': ['VOLKSWAGEN', 'VW'],
  'DDAIF': ['DAIMLER', 'MERCEDES-BENZ'],
  'BMWYY': ['BMW', 'BAYERISCHE MOTOREN'],
  'STLA': ['STELLANTIS'],

  'CMG': ['CHIPOTLE', 'CHIPOTLE MEXICAN GRILL'],
  'QSR': ['RESTAURANT BRANDS'],
  'DRI': ['DARDEN', 'DARDEN RESTAURANTS'],
  'DPZ': ['DOMINO\'S', 'DOMINO\'S PIZZA'],
  'PZZA': ['PAPA JOHN\'S'],
  'WING': ['WINGSTOP'],
  'SHAK': ['SHAKE SHACK'],
  'CAVA': ['CAVA'],

  'TJX': ['TJX', 'TJX COMPANIES'],
  'ROST': ['ROSS STORES'],
  'LULU': ['LULULEMON', 'LULULEMON ATHLETICA'],
  'NKE': ['NIKE'],
  'ADS': ['ADIDAS'],
  'VFC': ['V.F. CORPORATION', 'THE NORTH FACE'],
  'PVH': ['PVH', 'CALVIN KLEIN', 'TOMMY HILFIGER'],
  'RL': ['RALPH LAUREN'],
  'TPR': ['TAPESTRY', 'COACH'],

  'GLD': ['GOLD', 'SPDR GOLD'],
  'SLV': ['SILVER', 'SPDR SILVER'],
  'USO': ['OIL', 'USO', 'US OIL'],
  'UNG': ['NATURAL GAS', 'UNG'],
  'TLT': ['TREASURY', 'TLT', 'BONDS'],
  'HYG': ['HIGH YIELD', 'HYG', 'JUNK BONDS'],
  'LQD': ['CORPORATE BOND', 'LQD'],
  'VIX': ['VIX', 'VOLATILITY', 'FEAR INDEX'],
  'DXY': ['DOLLAR INDEX', 'DXY', 'USD INDEX'],
  'BTC': ['BITCOIN', 'BTC', 'BTCUSD'],
  'ETH': ['ETHEREUM', 'ETH', 'ETHUSD'],
  'SPY': ['S&P 500', 'SPY', 'SPDR S&P'],
  'QQQ': ['NASDAQ', 'QQQ', 'NASDAQ 100'],
  'DIA': ['DOW', 'DIA', 'DOW JONES'],
  'IWM': ['RUSSELL', 'IWM', 'RUSSELL 2000'],
  'EEM': ['EMERGING MARKETS', 'EEM'],
  'FXI': ['CHINA', 'FXI', 'CHINA LARGE CAP'],
  'EWJ': ['JAPAN', 'EWJ'],
  'EFA': ['DEVELOPED MARKETS', 'EFA'],
  'VNQ': ['REAL ESTATE', 'VNQ', 'REIT'],
  'XLE': ['ENERGY', 'XLE', 'ENERGY SELECT'],
  'XLK': ['TECHNOLOGY', 'XLK', 'TECH SELECT'],
  'XLF': ['FINANCIAL', 'XLF', 'FINANCIAL SELECT'],
  'XLV': ['HEALTHCARE', 'XLV', 'HEALTHCARE SELECT'],
  'XLI': ['INDUSTRIAL', 'XLI', 'INDUSTRIAL SELECT'],
  'XLP': ['CONSUMER STAPLES', 'XLP'],
  'XLY': ['CONSUMER DISCRETIONARY', 'XLY'],
  'XLU': ['UTILITIES', 'XLU'],
  'XLB': ['MATERIALS', 'XLB'],

  'ARKK': ['ARK INNOVATION', 'ARKK', 'CATHIE WOOD'],
  'ARKG': ['ARK GENOMICS'],
  'ARKQ': ['ARK AUTONOMOUS'],
  'ARKW': ['ARK NEXT GEN'],
  'ARKF': ['ARK FINTECH'],

  'SPXL': ['DIREXION S&P BULL'],
  'TQQQ': ['PROSHARES ULTRA PRO NASDAQ'],
  'SQQQ': ['PROSHARES ULTRA SHORT NASDAQ'],
  'UVXY': ['VIX SHORT TERM'],
  'SOXL': ['SEMICONDUCTOR BULL'],

  'BIL': ['T-BILLS', 'BILLS'],
  'SHY': ['SHORT TREASURY'],
  'IEF': ['INTERMEDIATE TREASURY'],
  'GOVT': ['GOVERNMENT BOND'],
  'TIP': ['TIPS', 'INFLATION PROTECTED'],
  'AGG': ['US AGGREGATE BOND', 'ISHARES CORE BOND'],
  'BND': ['VANGUARD TOTAL BOND'],
  'BSV': ['SHORT TERM BOND'],
  'BIV': ['INTERMEDIATE TERM BOND'],
  'BLV': ['LONG TERM BOND'],

  'VWO': ['EMERGING MARKETS STOCKS'],
  'VEA': ['DEVELOPED MARKETS STOCKS'],
  'VTI': ['TOTAL MARKET', 'VANGUARD TOTAL'],
  'VOO': ['VANGUARD S&P 500'],
  'IVV': ['ISHARES S&P 500'],
  'IWB': ['ISHARES RUSSELL 1000'],
  'VO': ['VANGUARD MID CAP'],
  'VB': ['VANGUARD SMALL CAP'],
  'IJR': ['ISHARES CORE S&P SMALL'],
  'IJH': ['ISHARES CORE S&P MIDCAP'],

  'BNDX': ['TOTAL INTERNATIONAL BOND'],
  'VXUS': ['TOTAL INTERNATIONAL STOCK'],
  'IXUS': ['ISHARES TOTAL INTERNATIONAL'],
  'IEFA': ['ISHARES CORE MSCI EAFE'],
  'IEMG': ['ISHARES CORE MSCI EMERGING'],

  'VTV': ['VALUE ETF', 'VANGUARD VALUE'],
  'VUG': ['GROWTH ETF', 'VANGUARD GROWTH'],
  'SPLV': ['LOW VOLATILITY'],
  'USMV': ['MINIMUM VOLATILITY'],
  'QUAL': ['QUALITY ETF'],
  'MTUM': ['MOMENTUM ETF'],
  'VYM': ['HIGH DIVIDEND YIELD'],
  'HDV': ['HIGH DIVIDEND INCOME'],
  'SCHD': ['DIVIDEND ETF'],
  'NOBL': ['DIVIDEND ACHIEVERS'],
  'DGRO': ['DIVIDEND GROWTH'],
  'VIG': ['DIVIDEND APPRECIATION'],

  'EFA': ['MSCI EAFE'],
  'EEM': ['MSCI EMERGING'],
  'EWJ': ['MSCI JAPAN'],
  'EWZ': ['MSCI BRAZIL'],
  'EWW': ['MSCI MEXICO'],
  'EWA': ['MSCI AUSTRALIA'],
  'EWC': ['MSCI CANADA'],
  'EWL': ['MSCI SWITZERLAND'],
  'EWN': ['MSCI NETHERLANDS'],
  'EWP': ['MSCI SPAIN'],
  'EWG': ['MSCI GERMANY'],
  'EWI': ['MSCI ITALY'],
  'EWU': ['MSCI UNITED KINGDOM'],
  'EWS': ['MSCI SINGAPORE'],
  'EWH': ['MSCI HONG KONG'],
  'EWY': ['MSCI SOUTH KOREA'],
  'EWT': ['MSCI TAIWAN'],
  'THD': ['MSCI THAILAND'],
  'EPOL': ['MSCI POLAND'],
  'EPU': ['MSCI PERU'],
  'ECH': ['MSCI CHILE'],
  'COLX': ['MSCI COLOMBIA'],
  'EIDO': ['MSCI INDONESIA'],
  'EPHE': ['MSCI PHILIPPINES'],
  'MYCL': ['MSCI MALAYSIA'],
  'VNM': ['MSCI VIETNAM'],
  'KSA': ['MSCI SAUDI ARABIA'],
  'QAT': ['MSCI QATAR'],
  'UAE': ['MSCI UNITED ARABIC EMIRATES'],
  'TUR': ['MSCI TURKEY'],
  'EZA': ['MSCI SOUTH AFRICA'],
  'EGPT': ['MSCI EGYPT'],
  'EIS': ['MSCI ISRAEL'],
  'FM': ['FRONTIER MARKETS'],
  'FPX': ['IPO INDEX'],
  'FTCS': ['FIRST TRUST'],
  'SMLV': ['SMALL CAP LOW VOLATILITY'],
  'SPLV': ['LOW VOLATILITY S&P 500'],
  'LGLV': ['LONG TERM LOW VOLATILITY'],
  'USMV': ['MINIMUM VOLATILITY S&P 500'],
  'EEMV': ['MINIMUM VOLATILITY EMERGING'],
  'EFAV': ['MINIMUM VOLATILITY EAFE'],
  'ACWI': ['ALL COUNTRY WORLD INDEX', 'MSCI ACWI'],
  'VT': ['VANGUARD TOTAL WORLD'],
  'URTH': ['MSCI WORLD'],
  'IWDA': ['ISHARES MSCI WORLD'],

  'ARKK': ['ARK INNOVATION'],
  'ARKG': ['ARK GENOMICS'],
  'ARKQ': ['ARK AUTONOMOUS'],
  'ARKW': ['ARK NEXT GEN INTERNET'],
  'ARKF': ['ARK FINTECH INNOVATION'],

  'GLD': ['SPDR GOLD SHARES'],
  'IAU': ['ISHARES GOLD'],
  'SLV': ['ISHARES SILVER'],
  'PPLT': ['ISHARES PLATINUM'],
  'PALL': ['ISHARES PALLADIUM'],
  'PDBC': ['COMMODITY BASKET'],
  'DJP': ['DJ AIG COMMODITY'],
  'USO': ['US OIL FUND'],
  'BNO': ['UNITED STATES BRENT OIL'],
  'UNG': ['UNITED STATES NATURAL GAS'],
  'BOIL': ['PROSHARES ULTRA NATURAL GAS'],
  'KOLD': ['PROSHARES ULTRA SHORT NATURAL GAS'],
  'UCO': ['PROSHARES ULTRA CRUDE OIL'],
  'SCO': ['PROSHARES ULTRA SHORT CRUDE OIL'],
  'DBO': ['INVESTMENTS DB OIL'],
  'USL': ['UNITED STATES 12 MONTH OIL'],
  'UWT': ['DIREXION DAILY WTI CRUDE'],
  'DWT': ['DIREXION DAILY WTI CRUDE BEAR'],
  'GDX': ['VANECK GOLD MINERS'],
  'GDXJ': ['VANECK JUNIOR GOLD MINERS'],
  'SIL': ['GLOBAL X SILVER MINERS'],
  'SILJ': ['AMPLIFY JUNIOR SILVER MINERS'],
  'PICK': ['ISHARES MSCI GLOBAL METALS'],
  'COPX': ['GLOBAL X COPPER MINERS'],
  'REMX': ['VANECK RARE EARTH'],
  'URNM': ['SPROTT URANIUM MINERS'],
  'UFO': ['PROCURE SPACE'],
  'SKYY': ['FIRST CLOUD COMPUTING'],
  'IBUY': ['AMPLIFY ONLINE RETAIL'],
  'DBUG': ['ISHARES CYBERSECURITY'],
  'CLOU': ['GLOBAL X CLOUD COMPUTING'],
  'KWEB': ['KRANESHARES CHINA INTERNET'],
  'SOXX': ['ISHARES SEMICONDUCTOR'],
  'SMH': ['VANECK SEMICONDUCTOR'],
  'XBI': ['SPDR S&P BIOTECH'],
  'IBB': ['ISHARES BIOTECHNOLOGY'],
  'PSI': ['INVESCO PHARMACEUTICAL'],
  'PJP': ['INVESCO PHARMACEUTICALS'],
  'XHB': ['SPDR S&P HOMEBUILDERS'],
  'ITB': ['ISHARES US HOME CONSTRUCTION'],
  'XHB': ['SPDR S&P HOMEBUILDERS'],
  'KBE': ['SPDR S&P BANK'],
  'KRE': ['SPDR S&P REGIONAL BANKING'],
  'XLF': ['SPDR S&P FINANCIAL'],
  'KIE': ['SPDR S&P INSURANCE'],
  'XBI': ['SPDR S&P BIOTECH'],
  'IBB': ['ISHARES BIOTECHNOLOGY'],
  'XPH': ['SPDR S&P PHARMACEUTICAL'],
  'XHE': ['SPDR S&P HEALTH CARE EQUIPMENT'],
  'XLV': ['SPDR S&P HEALTH CARE'],
  'XLI': ['SPDR S&P INDUSTRIAL'],
  'XLB': ['SPDR S&P MATERIALS'],
  'XLE': ['SPDR S&P ENERGY'],
  'XLU': ['SPDR S&P UTILITIES'],
  'XLK': ['SPDR S&P TECHNOLOGY'],
  'XLC': ['SPDR S&P COMMUNICATION'],
  'XLRE': ['SPDR S&P REAL ESTATE'],
  'XLRE': ['SPDR S&P REAL ESTATE'],
  'XME': ['SPDR S&P METALS & MINING'],
  'XOP': ['SPDR S&P OIL & GAS'],
  'XHB': ['SPDR S&P HOMEBUILDERS'],
  'XAR': ['SPDR S&P AEROSPACE & DEFENSE'],
  'XSD': ['SPDR S&P SEMICONDUCTOR'],
  'XHE': ['SPDR S&P HEALTH CARE EQUIPMENT'],
  'XHS': ['SPDR S&P HEALTH CARE SERVICES'],
  'XBI': ['SPDR S&P BIOTECH'],
  'XHB': ['SPDR S&P HOMEBUILDERS'],
  'XIT': ['ISHARES S&P CANADIAN TECH'],
  'XEN': ['ISHARES ESG AWARE MSCI EM'],
  'XIN': ['ISHARES MSCI CHINA'],
  'XJP': ['ISHARES MSCI JAPAN ESG'],
  'XUS': ['ISHARES ESG AWARE MSCI USA'],
  'XEF': ['ISHARES MSCI EAFE ESG'],
  'XEM': ['ISHARES MSCI EMERGING MARKETS ESG'],
  'XAX': ['ISHARES MSCI ACWI LOW CARBON'],
  'XWD': ['ISHARES MSCI WORLD ESG'],
  'XCL': ['ISHARES MSCI GLOBAL IMPACT'],
  'XCO': ['ISHARES MSCI GLOBAL CLEAN WATER'],
  'XDR': ['ISHARES MSCI GLOBAL GENDER'],
  'XDP': ['ISHARES MSCI GLOBAL GENDER DIVIDEND'],
  'XDV': ['ISHARES CANADIAN DIVIDEND'],
  'XDV': ['ISHARES CORE S&P US DIVIDEND'],
  'XDF': ['ISHARES CORE MSCI EAFE DIVIDEND'],
  'XDE': ['ISHARES EMERGING MARKETS DIVIDEND'],
  'XDS': ['ISHARES INTERNATIONAL DIVIDEND'],
  'XDH': ['ISHARES GLOBAL HIGH DIVIDEND'],
  'XDO': ['ISHARES CORE HIGH DIVIDEND'],
  'XIU': ['ISHARES S&P/TSX 60'],
  'XMD': ['ISHARES S&P/TSX MID CAP'],
  'XCS': ['ISHARES S&P/TSX SMALL CAP'],
  'XBB': ['ISHARES CANADIAN UNIVERSE BOND'],
  'XSB': ['ISHARES CANADIAN SHORT TERM BOND'],
  'XLB': ['ISHARES CANADIAN LONG TERM BOND'],
  'XRB': ['ISHARES REAL RETURN BOND'],
  'XCH': ['ISHARES CORE CANADIAN SHORT TERM BOND'],
  'XCM': ['ISHARES S&P/TSX CANADIAN MONITOR'],
  'XCD': ['ISHARES S&P/TSX CANADIAN DIVIDEND'],
  'XRE': ['ISHARES S&P/TSX CAPPED REAL ESTATE'],
  'XFN': ['ISHARES S&P/TSX CAPPED FINANCIALS'],
  'XIT': ['ISHARES S&P/TSX CAPPED INFO TECH'],
  'XEG': ['ISHARES S&P/TSX CAPPED ENERGY'],
  'XMA': ['ISHARES S&P/TSX CAPPED MATERIALS'],
  'XUT': ['ISHARES S&P/TSX CAPPED UTILITIES'],
  'XCI': ['ISHARES S&P/TSX CAPPED COMMUNICATIONS'],
  'XCC': ['ISHARES S&P/TSX CAPPED CONSUMER DISCRETIONARY'],
  'XSTC': ['ISHARES S&P/TSX CAPPED CONSUMER STAPLES'],
  'XHI': ['ISHARES S&P/TSX CAPPED HEALTH CARE'],
  'XID': ['ISHARES S&P/TSX CAPPED INDUSTRIALS'],
  'XEC': ['ISHARES S&P/TSX CAPPED ENERGY'],
  'XFM': ['ISHARES S&P/TSX CAPPED FINANCIALS'],
  'XMD': ['ISHARES S&P/TSX MID CAP INDEX'],
  'XCS': ['ISHARES S&P/TSX SMALL CAP INDEX'],
  'XIU': ['ISHARES S&P/TSX 60 INDEX'],
  'XIT': ['ISHARES S&P/TSX CAPPED INFO TECH INDEX'],
  'XEG': ['ISHARES S&P/TSX CAPPED ENERGY INDEX'],
  'XMA': ['ISHARES S&P/TSX CAPPED MATERIALS INDEX'],
  'XFN': ['ISHARES S&P/TSX CAPPED FINANCIALS INDEX'],
  'XUT': ['ISHARES S&P/TSX CAPPED UTILITIES INDEX'],
  'XRE': ['ISHARES S&P/TSX CAPPED REAL ESTATE INDEX'],
  'XCI': ['ISHARES S&P/TSX CAPPED COMMUNICATIONS INDEX'],
  'XCC': ['ISHARES S&P/TSX CAPPED CONSUMER DISCRETIONARY INDEX'],
  'XSTC': ['ISHARES S&P/TSX CAPPED CONSUMER STAPLES INDEX'],
  'XHI': ['ISHARES S&P/TSX CAPPED HEALTH CARE INDEX'],
  'XID': ['ISHARES S&P/TSX CAPPED INDUSTRIALS INDEX'],
  'XEC': ['ISHARES S&P/TSX CAPPED ENERGY INDEX'],
  'XFM': ['ISHARES S&P/TSX CAPPED FINANCIALS INDEX'],
  'XBB': ['ISHARES CANADIAN UNIVERSE BOND INDEX'],
  'XSB': ['ISHARES CANADIAN SHORT TERM BOND INDEX'],
  'XLB': ['ISHARES CANADIAN LONG TERM BOND INDEX'],
  'XRB': ['ISHARES REAL RETURN BOND INDEX'],
  'XCH': ['ISHARES CORE CANADIAN SHORT TERM BOND INDEX'],
  'XCM': ['ISHARES S&P/TSX CANADIAN MONITOR INDEX'],
  'XCD': ['ISHARES S&P/TSX CANADIAN DIVIDEND INDEX']
};

function matchesSymbol(item, symbol) {
  const s = symbol.toUpperCase();
  const title = (item.title || '').toUpperCase();

  const searchTerms = SYMBOL_MAP[s] || [s];
  const titleMatch = searchTerms.some(term => title.includes(term));
  if (titleMatch) return true;

  return false;
}

async function fetchFeed(source, url) {
  try {
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 10000
    });
    const parsed = await xml2js.parseStringPromise(data, { explicitArray: false, trim: true });
    const channel = parsed?.rss?.channel;
    if (!channel) return [];
    const items = Array.isArray(channel.item) ? channel.item : [channel.item].filter(Boolean);
    return items.map(item => ({
      title: typeof item.title === 'object' ? (item.title._ || item.title[0] || '') : (item.title || ''),
      link: typeof item.link === 'object' ? (item.link._ || item.link[0] || '') : (item.link || ''),
      description: ((typeof item.description === 'object' ? (item.description._ || item.description[0] || '') : (item.description || '')).replace(/<[^>]*>/g, '').trim().slice(0, 300)),
      pubDate: typeof item.pubDate === 'object' ? (item.pubDate._ || item.pubDate[0] || '') : (item.pubDate || ''),
      source: FEEDS[source].name
    }));
  } catch {
    return [];
  }
}

async function searchNews(symbol, limit = 10) {
  const allItems = [];

  const promises = Object.entries(FEEDS).flatMap(([source, feed]) =>
    feed.urls.map(url => fetchFeed(source, url))
  );

  const results = await Promise.allSettled(promises);
  for (const r of results) {
    if (r.status === 'fulfilled') allItems.push(...r.value);
  }

  const seen = new Set();
  const unique = allItems.filter(item => {
    const key = item.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const matching = unique
    .filter(item => matchesSymbol(item, symbol))
    .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
    .slice(0, limit);

  return matching;
}

async function getAllNews(limit = 20) {
  const allItems = [];

  const promises = Object.entries(FEEDS).flatMap(([source, feed]) =>
    feed.urls.map(url => fetchFeed(source, url))
  );

  const results = await Promise.allSettled(promises);
  for (const r of results) {
    if (r.status === 'fulfilled') allItems.push(...r.value);
  }

  const seen = new Set();
  return allItems
    .filter(item => {
      const key = item.title;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
    .slice(0, limit);
}

module.exports = { searchNews, getAllNews };
