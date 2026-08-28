# Train ETA Dataset — Data Dictionary

## Dataset Overview

This dataset contains train movement and delay observations
collected from a live railway train-tracking API.

The processed dataset is intended for exploratory analysis
and machine-learning-based train ETA/delay prediction.

---

## Columns

| Column | Data Type | Description | Example | ML Relevance |
|---|---|---|---|---|
| train_number | String | Unique train number being tracked | 12919 | High |
| station_sequence | Integer | Position of the station in the train route | 216 | High |
| station_code | String | Railway station code | JAT | High |
| station_name | String | Name of the railway station | Jammutavi | High |
| scheduled_arrival | Timestamp | Scheduled arrival time at the station | 2026-08-27T14:30:00+05:30 | High |
| actual_arrival | Timestamp | Actual/observed arrival time | 2026-08-27T18:20:00+05:30 | High |
| scheduled_departure | Timestamp | Scheduled departure time | 2026-08-27T14:35:00+05:30 | High |
| actual_departure | Timestamp | Actual/observed departure time | 2026-08-27T18:25:00+05:30 | High |
| delay_minutes | Integer | Delay in minutes relative to the schedule | 230 | Very High |
| distance_km | Numeric | Distance from the train's route origin | 1563 | High |
| speed_kmph | Numeric | Estimated/current speed toward the next station | 60 | High |
| station_status | String | Station status in the API response | upcoming | Medium |
| captured_at | Timestamp | Time at which the API observation was collected | 2026-08-27T08:59:54Z | Very High |

---

# Data Source

## Source

Live train-tracking API used by the data collector.

API endpoint pattern:

`https://railradar.in/api/v1/trains/{train_number}/live`

## Publisher

RailRadar / WIMT data provider as identified in the API response.

## Collection Method

Data is collected automatically using a Node.js collector.

The collector requests the live train endpoint and transforms
the returned route/station information into structured records.

## Collection Frequency

Approximately every 5 minutes.

## Train Currently Collected

Train number:

`12919`

## Collection Period

The initial dataset currently covers:

**2026-08-27T03:21:30Z → 2026-08-27T03:29:54Z**

This period will increase as the automated collector continues running.

---

# Raw Dataset

Original API responses are preserved separately in:

`data/raw/`

The raw JSON files are not modified after collection.

Example:

`train_12919_2026-08-27T08-59-54-685Z.json`

---

# Processed Dataset

The cleaned ML-oriented dataset is stored in:

`data/processed/train_history_ml.csv`

The processed dataset contains normalized station,
timing, delay, distance, speed and collection-time fields.

---

# Current Dataset Statistics

The initial quality analysis reported:

| Metric | Value |
|---|---:|
| Total observations | 264 |
| Unique trains | 1 |
| Unique stations | 107 |
| Collection timestamps | 5 |
| Duplicate rows | 0 |
| Average delay | 193.91 minutes |
| Maximum delay | 277 minutes |
| Average speed | 69.71 km/h |
| Maximum speed | 148.6 km/h |

These statistics represent the dataset at the time of the
initial quality analysis and should be regenerated as the
dataset grows.

---

# Data Quality

## Duplicate Records

The initial quality check detected:

**0 duplicate rows**

Duplicates were checked using a combination of:

- train number
- station
- scheduled arrival
- actual arrival
- capture timestamp

---

## Missing Values

Some fields may legitimately be unavailable depending on
the train's current state and the information returned by
the live API.

Examples include:

- actual arrival for stations not yet reached
- actual departure for stations not yet departed
- speed when speed information is unavailable
- geographic coordinates when not supplied by the source

Missing values are represented as `NULL` in Supabase and
empty values in the CSV where applicable.

---

# Preprocessing Performed

The collector performs the following preprocessing:

1. Extracts the route array from the API response.
2. Selects station records containing actual arrival or
   actual departure information.
3. Normalizes field names.
4. Converts unavailable values to `null`.
5. Preserves scheduled and actual timestamps.
6. Preserves delay information.
7. Preserves station sequence and distance.
8. Preserves speed information.
9. Adds a collection timestamp.
10. Stores the original API response separately.

---

# Route Information

The source provides route-level information including:

- station sequence
- station code
- station name
- distance
- scheduled arrival
- scheduled departure
- halt information
- speed toward the next station

---

# Delay Information

The dataset contains:

- scheduled arrival
- actual arrival
- scheduled departure
- actual departure
- delay in minutes

The `delay_minutes` field is derived from the available
arrival/departure delay information returned by the API.

---

# Time Features

The `captured_at` timestamp can be used to derive:

- date
- hour
- day of week
- month
- season
- collection interval

These derived features can be generated during ML preprocessing.

---

# Weather and External Factors

Weather data is **not currently included** in this dataset.

It should only be added if a reliable weather source can be
integrated and the observations can be correctly associated
with the train's location and collection time.

---

# Intended ML Usage

Potential prediction targets include:

- future delay in minutes
- estimated arrival time
- estimated arrival delay

Potential input features include:

- current delay
- station sequence
- distance
- speed
- scheduled arrival time
- scheduled departure time
- day of week
- hour of day
- train number
- station code
- historical delay patterns

## License / Usage

The dataset is collected through an authenticated RailRadar API
using the project's API access credentials.

RailRadar's Terms of Service were reviewed on 27 August 2026.
RailRadar describes its service as an independent, crowd-powered
train-tracking platform and states that it is not affiliated with
Indian Railways, IRCTC, or NTES.

No explicit open-data or redistribution license was identified in
the reviewed Terms of Service. Therefore, raw API responses and
API credentials should not be publicly redistributed without
confirming that such use is permitted under the applicable API
plan/terms.

The GitHub repository should contain the data-collection code and
documentation, while API credentials remain in environment
variables and are excluded from version control.