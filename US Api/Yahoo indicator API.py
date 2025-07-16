#!/usr/bin/env python
# coding: utf-8

# In[3]:


import yfinance as yf
import pandas as pd
import os

# 📁 저장 경로
SAVE_PATH = '/Users/jay/us-econ-dashboard/public'

# 📊 지표 목록 (정확한 명칭으로 표기, S&P500 -> ^GSPC로 수정)
symbols = {
    'USDJPY': 'JPY=X',                             # USD/JPY 환율
    'S&P 500': '^GSPC',                            # ✅ S&P 500 지수 (정식)
    'Dow Jones (DJI)': '^DJI',                     # 다우존스
    'NASDAQ (IXIC)': '^IXIC',                      # 나스닥
    'WTI Crude Oil': 'CL=F',                       # WTI 원유
    'Brent Crude Oil': 'BZ=F',                     # 브렌트유
    'Copper': 'HG=F',                              # 구리
    'Gold': 'GC=F',                                # 금
    'Silver': 'SI=F',                              # 은
    'VIX Index': '^VIX',                           # 변동성 지수
    'US Dollar Index (DXY)': 'DX-Y.NYB',           # 달러 인덱스
    'US 10Y Treasury Yield (TNX)': '^TNX',         # 10년 국채
    'US 13W T-Bill Rate (IRX)': '^IRX',            # 13주 T-Bill
    'US 30Y Treasury Yield (TYX)': '^TYX',         # 30년 국채
    'Bitcoin (BTC-USD)': 'BTC-USD'                 # 비트코인
}

# 📥 데이터 다운로드 및 CSV 저장
for name, symbol in symbols.items():
    try:
        print(f"⏳ Downloading {name}...")
        data = yf.download(symbol, start='1900-01-01', progress=False)

        if data.empty:
            print(f"❗ {name}: No data available.")
            continue

        df = data[['Close']].reset_index()
        df.columns = ['date', 'value']

        filename = os.path.join(
            SAVE_PATH,
            f"{name.replace(' ', '_').replace('(', '').replace(')', '').replace('-', '').replace('/', '')}.csv"
        )
        df.to_csv(filename, index=False)

        print(f"✅ {name} saved successfully: {filename} ({len(df)} rows)")

    except Exception as e:
        print(f"❌ {name} error: {e}")

# 📊 장단기 금리 스프레드 계산 (10Y - 13W)
try:
    tnx_df = pd.read_csv(os.path.join(SAVE_PATH, 'US_10Y_Treasury_Yield_TNX.csv'))
    irx_df = pd.read_csv(os.path.join(SAVE_PATH, 'US_13W_TBill_Rate_IRX.csv'))

    merged = pd.merge(tnx_df, irx_df, on='date', suffixes=('_10Y', '_13W'))
    merged['value'] = merged['value_10Y'] - merged['value_13W']

    spread_filename = os.path.join(SAVE_PATH, 'Yield_Spread_10Y_minus_13W.csv')
    merged[['date', 'value']].to_csv(spread_filename, index=False)

    print(f"✅ Yield Spread saved: {spread_filename} ({len(merged)} rows)")

except Exception as e:
    print(f"❌ Yield Spread error: {e}")


# In[ ]:




