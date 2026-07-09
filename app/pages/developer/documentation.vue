<script setup lang="ts">
import { Copy, Check, KeyRound, Webhook, ShieldCheck, ListTree, Braces, Terminal } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

const toast = useToast()

// ---- Copy handling ----
const copiedKey = ref('')
async function copyCode(text: string, key: string) {
  try {
    await navigator.clipboard.writeText(text)
    copiedKey.value = key
    setTimeout(() => { copiedKey.value = '' }, 2000)
  }
  catch {
    toast.error('Gagal menyalin')
  }
}

// ---- In-page navigation ----
const sections = [
  { id: 'ringkasan', label: 'Ringkasan' },
  { id: 'autentikasi', label: 'Autentikasi' },
  { id: 'format-respons', label: 'Format Respons' },
  { id: 'parameter', label: 'Parameter Query' },
  { id: 'endpoints', label: 'Daftar Endpoint' },
  { id: 'orders', label: 'Orders' },
  { id: 'products', label: 'Products' },
  { id: 'customers', label: 'Customers' },
  { id: 'webhook', label: 'Webhook Keluar' },
  { id: 'events', label: 'Daftar Event' },
  { id: 'signature', label: 'Verifikasi Signature' },
  { id: 'sample-code', label: 'Contoh Kode' },
]

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// ---- Multi-language code samples ----
const CODE_LANGS = [
  { key: 'go', label: 'Go' },
  { key: 'js', label: 'JavaScript' },
  { key: 'ts', label: 'TypeScript' },
  { key: 'php', label: 'PHP' },
  { key: 'python', label: 'Python' },
] as const
type CodeLang = typeof CODE_LANGS[number]['key']

const activeLang = ref<CodeLang>('js')

const reqSamples: Record<CodeLang, string> = {
  go: `package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

const (
	baseURL = "https://<host>"
	apiKey  = "ak_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
)

func main() {
	req, _ := http.NewRequest("GET", baseURL+"/api/v1/orders?status=completed&per_page=20", nil)
	req.Header.Set("X-Api-Key", apiKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result map[string]any
	json.Unmarshal(body, &result)
	fmt.Println(result["message"])
}`,
  js: `const BASE_URL = "https://<host>";
const API_KEY = "ak_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

const params = new URLSearchParams({ status: "completed", per_page: "20" });
const url = BASE_URL + "/api/v1/orders?" + params.toString();

const res = await fetch(url, {
  headers: { "X-Api-Key": API_KEY },
});

if (!res.ok) throw new Error("HTTP " + res.status);

const { data } = await res.json();
console.log(data.total, data.data);`,
  ts: `const BASE_URL = "https://<host>";
const API_KEY = "ak_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

interface Paginated<T> {
  data: T[];
  page: number;
  per_page: number;
  total: number;
  total_page: number;
}

interface Order {
  id: string;
  no: string;
  status: string;
  grand_total: string;
}

async function listOrders(): Promise<Paginated<Order>> {
  const params = new URLSearchParams({ status: "completed", per_page: "20" });
  const url = BASE_URL + "/api/v1/orders?" + params.toString();

  const res = await fetch(url, { headers: { "X-Api-Key": API_KEY } });
  if (!res.ok) throw new Error("HTTP " + res.status);

  const json = (await res.json()) as { data: Paginated<Order> };
  return json.data;
}

console.log(await listOrders());`,
  php: `<?php
$baseUrl = "https://<host>";
$apiKey  = "ak_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

$query = http_build_query(["status" => "completed", "per_page" => 20]);

$ch = curl_init("$baseUrl/api/v1/orders?$query");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["X-Api-Key: $apiKey"]);

$response = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($status !== 200) {
    throw new Exception("HTTP $status");
}

$data = json_decode($response, true)["data"];
echo $data["total"] . PHP_EOL;`,
  python: `import requests

BASE_URL = "https://<host>"
API_KEY = "ak_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

resp = requests.get(
    f"{BASE_URL}/api/v1/orders",
    headers={"X-Api-Key": API_KEY},
    params={"status": "completed", "per_page": 20},
    timeout=30,
)
resp.raise_for_status()

data = resp.json()["data"]
print(data["total"], len(data["data"]))`,
}

const verifySamples: Record<CodeLang, string> = {
  go: `package webhook

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
)

// verify returns true when the signature header matches the raw body.
func verify(rawBody []byte, signatureHeader, secret string) bool {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(rawBody)
	expected := "sha256=" + hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(signatureHeader))
}`,
  js: `const crypto = require("crypto");

function verify(rawBody, signatureHeader, secret) {
  const expected =
    "sha256=" +
    crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signatureHeader)
  );
}`,
  ts: `import crypto from "crypto";
import type { Request, Response } from "express";

const SECRET = process.env.WEBHOOK_SECRET as string;

function verify(rawBody: Buffer, signature: string): boolean {
  const expected =
    "sha256=" +
    crypto.createHmac("sha256", SECRET).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

// Mount with express.raw({ type: "application/json" }) so req.body is a Buffer.
export function handler(req: Request, res: Response) {
  const signature = req.header("X-Webhook-Signature") ?? "";
  if (!verify(req.body, signature)) {
    return res.status(401).send("invalid signature");
  }
  const event = JSON.parse(req.body.toString());
  console.log(event.event, event.data);
  res.sendStatus(200);
}`,
  php: `<?php
$secret = getenv("WEBHOOK_SECRET");
$rawBody = file_get_contents("php://input");
$signature = $_SERVER["HTTP_X_WEBHOOK_SIGNATURE"] ?? "";

$expected = "sha256=" . hash_hmac("sha256", $rawBody, $secret);

if (!hash_equals($expected, $signature)) {
    http_response_code(401);
    exit("invalid signature");
}

$event = json_decode($rawBody, true);
error_log("webhook: " . $event["event"]);
http_response_code(200);`,
  python: `import hashlib
import hmac
import os

from flask import Flask, request, abort

app = Flask(__name__)
SECRET = os.environ["WEBHOOK_SECRET"].encode()

@app.post("/webhook")
def webhook():
    raw = request.get_data()
    signature = request.headers.get("X-Webhook-Signature", "")
    expected = "sha256=" + hmac.new(SECRET, raw, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        abort(401)
    event = request.get_json()
    print(event["event"], event["data"])
    return "", 200`,
}

// ---- Static snippets ----
const authHeaderSnippet = `X-Api-Key: ak_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# atau
Authorization: Bearer ak_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

const listResponseSnippet = `{
  "message": "data retrieved successfully",
  "data": {
    "data": [ /* array item */ ],
    "page": 1,
    "per_page": 20,
    "total": 137,
    "total_page": 7
  }
}`

const orderResponseSnippet = `{
  "message": "data retrieved successfully",
  "data": {
    "id": "01KX2WJZ91JGHG1HYXBQZVA2R2",
    "business_id": "01KQ94MTZKQVCFNMKJBEEAN6SY",
    "store_id": "01KQ94MV1VPGHAD5TD9AK9VRXJ",
    "warehouse_id": "01KQ9DZKY9DC0J9JMQKTFSV2GE",
    "customer_id": "01KW21N1NGJ4A6JBY89W0WWZFG",
    "customer_category_id": "01KW21MXNQYNTFKEFQJCCPGQPD",
    "external_id": "",
    "staff_id": "01KQYQP207K92FBT2QC6TBDE48",
    "no": "SO26000034",
    "date_created": "2026-07-09T07:30:00+07:00",
    "date_due": "2026-07-10T07:30:00+07:00",
    "date_paid": "0001-01-01T07:07:12+07:07",
    "qty": 1,
    "qty_returned": 0,
    "weight": 500,
    "subtotal": "196000",
    "discount": "10000",
    "shipping_cost": "19600",
    "shipping_discount": "2000",
    "shipping_total": "17600",
    "adjustment": "1000",
    "tax": "0",
    "total": "204600",
    "grand_total": "204600",
    "payment_total": "0",
    "cogs_total": "0",
    "preorder": "no",
    "status": "pending",
    "sub_status": "unpaid",
    "payment_status": "unpaid",
    "payment_provider": "internal",
    "payment_method": "bank_transfer",
    "cod": "no",
    "note": "",
    "customer_note": "",
    "tags": [],
    "source": "Iklan",
    "repeat_order": false,
    "created_at": "2026-07-09T14:31:00.513249+07:00",
    "updated_at": "2026-07-09T14:31:00.513249+07:00",
    "items": [
      {
        "id": "01KX2WJZ9DR6N6QMBDK8CNHSS8",
        "order_id": "01KX2WJZ91JGHG1HYXBQZVA2R2",
        "category_id": "01KWCCBJ4C2SSXCQBP1XFRFKS6",
        "image": "https://is3.cloudhost.id/godev/medias/.../3EBoXYpQ0-Coksu-4-small.webp",
        "product_id": "01KWCD6VK29SX9WBCTDJP20XK4",
        "sku_id": "01KWCD72PC4XV0XCTNV1T5DYVF",
        "category_name": "Gamis/ Dress",
        "name": "Naira Dress",
        "sku": "1110053022",
        "variants": [
          { "name": "Warna", "value": "Coklat Susu" },
          { "name": "Ukuran", "value": "M" }
        ],
        "weight": 500,
        "qty": 1,
        "price": "196000",
        "discount": "0",
        "total": "196000",
        "cogs": "0",
        "cogs_total": "0",
        "qty_returned": 0,
        "is_free": "no"
      }
    ],
    "address": {
      "id": "01KX2WJZ99NSAAZP7MD5R8RKNX",
      "order_id": "01KX2WJZ91JGHG1HYXBQZVA2R2",
      "name": "Tri Palupi Rahmawati",
      "phone": "6285939900644",
      "address": "Pondok Pesantren Binaul Ummah komplek 1 Ploso Wonolelo Pleret Bantul",
      "country": "Indonesia",
      "province": "Daerah Istimewa Yogyakarta",
      "city": "Kabupaten Bantul",
      "district": "Pleret",
      "zipcode": "55791"
    },
    "shipment": {
      "id": "01KX2WJZ9B0Z2N7XNTJS1CY27J",
      "order_id": "01KX2WJZ91JGHG1HYXBQZVA2R2",
      "courier_code": "ide",
      "courier_name": "ID Express",
      "service_name": "Standard",
      "service_code": "iDSTD",
      "tracking_no": "",
      "price": "19600",
      "discount": "2000",
      "total": "17600",
      "aggregator": "everpro",
      "aggregator_status": false
    },
    "dropship": {
      "id": "01KW3T3PY59XX5QF98WRJN3T1E",
      "order_id": "01KW3T3PXQTPREA8F4WN6KSC0C",
      "name": "halo",
      "phone": "089876543456",
      "type": "regular",
      "source": "",
      "file": ""
    },
  "payments": [
    {
      "id": "01KX2WZ81SRE35SNXS2H3WKGBV",
      "order_id": "01KWH4AB6A67TR5JMXXV3TT5W2",
      "wallet_id": "01KW8W81PBZR29XTW3Y93HKY1F",
      "external_id": "",
      "no": "SP26000028",
      "date": "2026-07-09T07:00:00+07:00",
      "amount": "209000",
      "actual_amount": "209000",
      "provider": "internal",
      "method": "bank_transfer",
      "file": "https://is3.cloudhost.id/godev/medias/01KQ94MTZKQVCFNMKJBEEAN6SY/order-payment/arafa1-rtdnyx1wxu.webp",
      "note": "",
      "status": "done",
      "bank_type": "bank",
      "bank_name": "BRI",
      "account_number": "1202323232",
      "account_name": "Agus Tander",
      "created_at": "2026-07-09T14:37:42.713373+07:00",
      "updated_at": "2026-07-09T14:37:42.713373+07:00",
      "wallet": {
          "id": "01KW8W81PBZR29XTW3Y93HKY1F",
          "name": "BRI"
      }
    }
  ],
    "store": {
      "id": "01KQ94MV1VPGHAD5TD9AK9VRXJ",
      "shop_name": "Internal",
      "source": "internal"
    },
    "warehouse": { "id": "01KQ9DZKY9DC0J9JMQKTFSV2GE", "name": "Utama" },
    "customer": {
      "id": "01KW21N1NGJ4A6JBY89W0WWZFG",
      "name": "Tri Palupi Rahmawati",
      "phone": "6285939900644",
      "customer_category_id": "01KW21MXNQYNTFKEFQJCCPGQPD",
      "category": { "id": "01KW21MXNQYNTFKEFQJCCPGQPD", "name": "Reseller" }
    },
    "staff": { "id": "01KQYQP207K92FBT2QC6TBDE48", "name": "Hasni" }
  }
}`

const productResponseSnippet = `{
  "message": "data retrieved successfully",
  "data": {
    "id": "01KWCD6VK29SX9WBCTDJP20XK4",
    "business_id": "01KQ94MTZKQVCFNMKJBEEAN6SY",
    "product_category_id": "01KWCCBJ4C2SSXCQBP1XFRFKS6",
    "store_id": "",
    "name": "Naira Dress",
    "slug": "naira-dress",
    "description": "<p>Naira Dress by Arafa Hijab</p>...",
    "thumbnail": "https://is3.cloudhost.id/godev/medias/.../Cover-WEB6.webp",
    "thumbnail_small": "https://is3.cloudhost.id/godev/medias/.../Cover-WEB6-small.webp",
    "images": [
      "https://is3.cloudhost.id/godev/medias/.../Cover-WEB.webp",
      "https://is3.cloudhost.id/godev/medias/.../Cover-WEB2.webp"
    ],
    "variant1": "Warna",
    "variant2": "Ukuran",
    "tags": [],
    "type": "master",
    "status": "active",
    "sold": 0,
    "created_at": "2026-06-30T20:58:57.37854+07:00",
    "updated_at": "2026-06-30T20:58:57.37854+07:00",
    "skus": [
      {
        "id": "01KWCD72PC4XV0XCTNV1T5DYVF",
        "image": "https://is3.cloudhost.id/godev/medias/.../3EBoXYpQ0-Coksu-4.webp",
        "product_id": "01KWCD6VK29SX9WBCTDJP20XK4",
        "sku": "1110053022",
        "variants": [
          { "name": "Warna", "value": "Coklat Susu" },
          { "name": "Ukuran", "value": "M" }
        ],
        "weight": 500,
        "is_preorder": false,
        "buffer_stock": 5,
        "rewards_point": "0",
        "status": "active",
        "sold": 0,
        "prices": [
          {
            "id": "01KWCD72PEHVQZZTE4M278PWF2",
            "sku_id": "01KWCD72PC4XV0XCTNV1T5DYVF",
            "customer_category_id": "01KW21MXNT42VYAFZJRWW5GT9N",
            "price": "245000",
            "customer_category": { "id": "01KW21MXNT42VYAFZJRWW5GT9N", "name": "Regular" }
          },
          {
            "id": "01KWCD72PF9WG861YCFPT13F84",
            "sku_id": "01KWCD72PC4XV0XCTNV1T5DYVF",
            "customer_category_id": "01KW21MXNQYNTFKEFQJCCPGQPD",
            "price": "196000",
            "customer_category": { "id": "01KW21MXNQYNTFKEFQJCCPGQPD", "name": "Reseller" }
          }
          /* ... kategori harga lainnya ... */
        ],
        "stocks": [
          {
            "id": "01KWCD9VK1DY0ED68DMC8FCHR6",
            "product_id": "01KWCD6VK29SX9WBCTDJP20XK4",
            "sku_id": "01KWCD72PC4XV0XCTNV1T5DYVF",
            "warehouse_id": "01KQ9DZKY9DC0J9JMQKTFSV2GE",
            "stock_warehouse": 29,
            "stock_locked": 5,
            "stock_available": 24,
            "average_price": "110000",
            "total": "3190000",
            "warehouse": { "id": "01KQ9DZKY9DC0J9JMQKTFSV2GE", "name": "Utama" }
          }
        ]
      }
      /* ... SKU lainnya ... */
    ],
    "category": {
      "id": "01KWCCBJ4C2SSXCQBP1XFRFKS6",
      "parent_id": "01KWCB4TP3H0Y1W6YHV917J1E8",
      "name": "Gamis/ Dress",
      "slug": "wanita-dewasa-atasan-gamis-dress"
    }
  }
}`

const customerResponseSnippet = `{
  "message": "data retrieved successfully",
  "data": {
    "id": "01KW21N1NJH57686VCK153Y2Z8",
    "business_id": "01KQ94MTZKQVCFNMKJBEEAN6SY",
    "store_id": "",
    "customer_category_id": "01KW21MXNQ1XYBNF4VMWXZGFV9",
    "external_id": "a21d253a-2693-4a88-a106-a0a40f9b3a02",
    "name": "Aguswi wiwi",
    "phone": "6285823568066",
    "email": "",
    "username": "E/AHR/15569XX",
    "type": "customer",
    "status": "active",
    "login_status": "active",
    "created_at": "2026-06-26T14:57:03+07:00",
    "updated_at": "2026-07-03T13:24:21.023816+07:00",
    "category": { "id": "01KW21MXNQ1XYBNF4VMWXZGFV9", "name": "Advertiser" },
    "addresses": [
      {
        "id": "01KW21N96VNJMVD3ECF8ED4K77",
        "customer_id": "01KW21N1NJH57686VCK153Y2Z8",
        "name": "Aguswi wiwi",
        "phone": "085823568066",
        "address": "jl pantai kaili lorong SDK pangi , Kelurahan/Desa:Pangi",
        "country": "Indonesia",
        "province": "Sulawesi Tengah",
        "city": "Kabupaten Parigi Moutong",
        "district": "Parigi Utara",
        "zipcode": "94371",
        "primary": true
      }
    ]
  }
}`

const dateFilterSnippet = `GET /api/v1/orders?date_type=date_completed&date_from=2026-07-01T00:00:00%2B07:00&date_to=2026-07-09T23:59:59%2B07:00&status=completed&page=1&per_page=50
X-Api-Key: ak_xxx`

const webhookHeadersSnippet = `Content-Type: application/json
User-Agent: arafahijab-webhook/1.0
X-Webhook-Id: 01J8ZQ...
X-Webhook-Event: order.created
X-Webhook-Signature: sha256=<hex>`

const envelopeSnippet = `{
  "id": "01J8ZQ...",
  "event": "order.created",
  "business_id": "01J...",
  "created_at": "2026-07-09T03:20:00Z",
  "data": { }
}`

const stockResponseSnippet = `{
  "message": "data retrieved successfully",
  "data": {
    "data": [
      {
        "id": "01KWCD9VK1DY0ED68DMC8FCHR6",
        "business_id": "01KQ94MTZKQVCFNMKJBEEAN6SY",
        "product_id": "01KWCD6VK29SX9WBCTDJP20XK4",
        "sku_id": "01KWCD72PC4XV0XCTNV1T5DYVF",
        "warehouse_id": "01KQ9DZKY9DC0J9JMQKTFSV2GE",
        "stock_warehouse": 29,
        "stock_locked": 5,
        "stock_available": 24,
        "average_price": "110000",
        "total": "3190000",
        "created_at": "2026-06-30T21:00:35.681504+07:00",
        "updated_at": "2026-07-09T14:31:00.532213+07:00",
        "warehouse": { "id": "01KQ9DZKY9DC0J9JMQKTFSV2GE", "name": "Utama" }
      }
    ],
    "page": 1,
    "per_page": 20,
    "total": 137,
    "total_page": 7
  }
}`

// ---- Reference tables ----
const endpoints = [
  { method: 'GET', path: '/api/v1/orders', desc: 'List order.' },
  { method: 'GET', path: '/api/v1/orders/:id', desc: 'Detail order (items, address, shipment, payments, dll).' },
  { method: 'GET', path: '/api/v1/products', desc: 'List produk.' },
  { method: 'GET', path: '/api/v1/products/:id', desc: 'Detail produk (skus, prices, stocks, category).' },
  { method: 'GET', path: '/api/v1/customers', desc: 'List customer.' },
  { method: 'GET', path: '/api/v1/customers/:id', desc: 'Detail customer (category, addresses).' },
]

const paginationParams = [
  { name: 'page', type: 'int', def: '1', desc: 'Halaman (mulai dari 1).' },
  { name: 'per_page', type: 'int', def: '20', desc: 'Item per halaman. Maksimum 100.' },
  { name: 'search', type: 'string', def: '-', desc: 'Kata kunci pencarian (kolom berbeda tiap resource).' },
  { name: 'status', type: 'string', def: '-', desc: 'Filter status (nilai tergantung resource).' },
  { name: 'date_type', type: 'string', def: 'date_created', desc: 'orders — kolom tanggal untuk filter & urutan.' },
  { name: 'date_from', type: 'string', def: '-', desc: 'orders — batas bawah tanggal (inklusif). Wajib menyertakan timezone, mis. 2026-07-01T00:00:00+07:00.' },
  { name: 'date_to', type: 'string', def: '-', desc: 'orders — batas atas tanggal (inklusif). Wajib menyertakan timezone, mis. 2026-07-09T23:59:59+07:00.' },
  { name: 'sku_id', type: 'string', def: '-', desc: 'stocks — filter berdasarkan SKU.' },
  { name: 'warehouse_id', type: 'string', def: '-', desc: 'stocks — filter berdasarkan gudang.' },
]

const errorCodes = [
  { code: '400', body: '{ "error": "Invalid request" }', cond: 'Query/body tidak bisa diparse.' },
  { code: '401', body: '{ "error": "Missing API key" }', cond: 'Header API key tidak ada.' },
  { code: '401', body: '{ "error": "Invalid API key" }', cond: 'Key salah / tidak dikenal.' },
  { code: '404', body: '{ "error": "order tidak ditemukan" }', cond: 'Resource tidak ditemukan.' },
  { code: '422', body: '{ "error": "...", "errors": { } }', cond: 'Validasi gagal.' },
  { code: '500', body: '{ "error": "<pesan>" }', cond: 'Error server.' },
]

const dateTypes = [
  { value: 'date_created', col: 'date_created', note: 'default' },
  { value: 'date_process / date_processed', col: 'date_processed', note: '' },
  { value: 'date_shipped', col: 'date_shipped', note: '' },
  { value: 'date_completed', col: 'date_completed', note: '' },
  { value: 'date_canceled', col: 'date_canceled', note: '' },
]

const orderFields = [
  { name: 'id', type: 'string(26)', desc: 'ID order (ULID).' },
  { name: 'no', type: 'string', desc: 'Nomor order.' },
  { name: 'status', type: 'string', desc: 'Status order (mis. pending, completed).' },
  { name: 'sub_status', type: 'string', desc: 'Sub-status (mis. unpaid).' },
  { name: 'payment_status', type: 'string', desc: 'unpaid / paid / dll.' },
  { name: 'date_created', type: 'datetime', desc: 'Tanggal dibuat.' },
  { name: 'date_completed', type: 'datetime', desc: 'Tanggal selesai.' },
  { name: 'qty', type: 'int64', desc: 'Total qty.' },
  { name: 'subtotal', type: 'decimal', desc: 'Subtotal.' },
  { name: 'discount', type: 'decimal', desc: 'Diskon.' },
  { name: 'shipping_total', type: 'decimal', desc: 'Total ongkir.' },
  { name: 'total', type: 'decimal', desc: 'Total.' },
  { name: 'grand_total', type: 'decimal', desc: 'Grand total.' },
  { name: 'source', type: 'string', desc: 'Sumber order (mis. pos, shopee).' },
  { name: 'items', type: 'array', desc: 'Daftar item order.' },
  { name: 'address', type: 'object', desc: 'Alamat pengiriman.' },
  { name: 'shipment', type: 'object', desc: 'Info pengiriman & resi.' },
  { name: 'payments', type: 'array', desc: 'Riwayat pembayaran.' },
  { name: 'customer', type: 'object', desc: '{ id, name, phone, category }.' },
]

const productFields = [
  { name: 'id', type: 'string', desc: 'ID produk.' },
  { name: 'name', type: 'string', desc: 'Nama produk.' },
  { name: 'slug', type: 'string', desc: 'Slug.' },
  { name: 'status', type: 'string', desc: 'active / inactive.' },
  { name: 'thumbnail', type: 'string', desc: 'URL thumbnail.' },
  { name: 'images', type: 'json', desc: 'Array URL gambar.' },
  { name: 'variant1 / variant2', type: 'string', desc: 'Nama dimensi varian.' },
  { name: 'sold', type: 'int64', desc: 'Jumlah terjual.' },
  { name: 'skus', type: 'array', desc: 'Daftar SKU (prices, stocks).' },
  { name: 'category', type: 'object', desc: '{ id, parent_id, name, slug }.' },
]

const customerFields = [
  { name: 'id', type: 'string', desc: 'ID customer.' },
  { name: 'name', type: 'string', desc: 'Nama.' },
  { name: 'phone', type: 'string', desc: 'Telepon.' },
  { name: 'email', type: 'string', desc: 'Email.' },
  { name: 'type', type: 'string', desc: 'Default customer.' },
  { name: 'status', type: 'string', desc: 'active / inactive.' },
  { name: 'category', type: 'object', desc: '{ id, name }.' },
  { name: 'addresses', type: 'array', desc: 'Daftar alamat customer.' },
]

const stockFields = [
  { name: 'id', type: 'string', desc: 'ID stok.' },
  { name: 'product_id', type: 'string', desc: 'ID produk.' },
  { name: 'sku_id', type: 'string', desc: 'ID SKU.' },
  { name: 'warehouse_id', type: 'string', desc: 'ID gudang.' },
  { name: 'stock_warehouse', type: 'int64', desc: 'Stok fisik di gudang.' },
  { name: 'stock_locked', type: 'int64', desc: 'Stok terkunci.' },
  { name: 'stock_available', type: 'int64', desc: 'Stok tersedia.' },
  { name: 'average_price', type: 'decimal', desc: 'Harga rata-rata (HPP).' },
  { name: 'total', type: 'decimal', desc: 'Nilai total stok.' },
  { name: 'warehouse', type: 'object', desc: '{ id, name }.' },
]

const events = [
  { event: 'order.created', trigger: 'Order baru dibuat.', data: 'id, no, status, payment_status, total' },
  { event: 'order.updated', trigger: 'Order diperbarui.', data: 'id' },
  { event: 'order.status_updated', trigger: 'Status order berubah.', data: 'id, status, sub_status' },
  { event: 'payment.received', trigger: 'Pembayaran order diterima.', data: 'id, order_id, amount, provider, method' },
  { event: 'payment.updated', trigger: 'Status pembayaran berubah / dibatalkan.', data: 'id, order_id, amount, status' },
  { event: 'stock.changed', trigger: 'Stok berubah via penyesuaian stok.', data: 'id, no, warehouse_id, source' },
  { event: 'webhook.test', trigger: 'Event uji dari tombol test.', data: 'message, time' },
]

const webhookHeaders = [
  { header: 'Content-Type', example: 'application/json', desc: '-' },
  { header: 'User-Agent', example: 'arafahijab-webhook/1.0', desc: '-' },
  { header: 'X-Webhook-Id', example: '01J8ZQ...', desc: 'ID unik pengiriman. Pakai untuk idempotensi.' },
  { header: 'X-Webhook-Event', example: 'order.created', desc: 'Nama event.' },
  { header: 'X-Webhook-Signature', example: 'sha256=<hex>', desc: 'HMAC-SHA256 dari raw body memakai secret.' },
]

const methodClass: Record<string, string> = {
  GET: 'bg-emerald-100 text-emerald-700',
  POST: 'bg-blue-100 text-blue-700',
  PUT: 'bg-amber-100 text-amber-700',
  DELETE: 'bg-red-100 text-red-700',
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Developer</h1>
      <p class="mt-1 text-sm text-gray-500">Kelola API key dan webhook untuk integrasi eksternal.</p>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 border-b border-gray-200">
      <NuxtLink
        to="/developer"
        class="border-b-2 border-transparent px-4 py-2.5 text-sm font-semibold text-gray-500 transition-colors hover:text-gray-700"
      >
        Konfigurasi
      </NuxtLink>
      <NuxtLink
        to="/developer/webhook-history"
        class="border-b-2 border-transparent px-4 py-2.5 text-sm font-semibold text-gray-500 transition-colors hover:text-gray-700"
      >
        Webhook History
      </NuxtLink>
      <NuxtLink
        to="/developer/documentation"
        class="border-b-2 border-primary-600 px-4 py-2.5 text-sm font-semibold text-primary-600"
      >
        Dokumentasi API
      </NuxtLink>
    </div>

    <div class="flex gap-6">
      <!-- TOC -->
      <aside class="hidden w-56 shrink-0 lg:block">
        <nav class="sticky top-6 space-y-0.5">
          <button
            v-for="s in sections"
            :key="s.id"
            type="button"
            class="block w-full rounded-lg px-3 py-1.5 text-left text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
            @click="scrollTo(s.id)"
          >
            {{ s.label }}
          </button>
        </nav>
      </aside>

      <!-- Content -->
      <div class="min-w-0 flex-1 space-y-10">
        <!-- Ringkasan -->
        <section id="ringkasan" class="scroll-mt-6 space-y-4">
          <h2 class="flex items-center gap-2 text-lg font-bold text-gray-900">
            <ListTree class="h-5 w-5 text-primary-500" /> Ringkasan
          </h2>
          <p class="text-sm leading-relaxed text-gray-600">
            REST API publik bersifat <strong>read-only</strong> dan diautentikasi dengan API Key.
            Semua data otomatis ter-scope ke business milik API key. Selain itu tersedia
            <strong>webhook keluar</strong> untuk menerima notifikasi realtime saat terjadi peristiwa bisnis.
          </p>
          <div class="overflow-hidden rounded-xl border border-gray-200">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th class="px-4 py-2.5 text-left font-medium">Bagian</th>
                  <th class="px-4 py-2.5 text-left font-medium">Base Url</th>
                  <th class="px-4 py-2.5 text-left font-medium">Autentikasi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr>
                  <td class="px-4 py-2.5 text-gray-700">REST API publik (read-only)</td>
                  <td class="px-4 py-2.5"><code class="font-mono text-xs text-primary-600">/api/v1</code></td>
                  <td class="px-4 py-2.5 text-gray-600">API Key (<code class="font-mono text-xs">X-Api-Key</code>)</td>
                </tr> 
              </tbody>
            </table>
          </div>
          <div class="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <p><strong>Base URL:</strong> <code class="font-mono text-xs"><b>https://v2.api.arafahijab.co.id</b></code><br/>
                contoh endpoint order: <code class="font-mono text-xs">https://v2.api.arafahijab.co.id/api/v1/orders</code>.</p>
            <p class="mt-1">Semua request/response memakai <code class="font-mono text-xs">application/json</code>.</p>
          </div>
        </section>

        <!-- Autentikasi -->
        <section id="autentikasi" class="scroll-mt-6 space-y-4">
          <h2 class="flex items-center gap-2 text-lg font-bold text-gray-900">
            <KeyRound class="h-5 w-5 text-primary-500" /> Autentikasi
          </h2>
          <p class="text-sm leading-relaxed text-gray-600">
            Setiap request ke <code class="font-mono text-xs">/api/v1/*</code> wajib menyertakan API key melalui salah satu header berikut.
            API key berformat <code class="font-mono text-xs">ak_</code> + 48 karakter.
          </p>
          <div class="group relative">
            <pre class="overflow-x-auto rounded-xl bg-gray-900 px-4 py-3.5 text-[13px] leading-relaxed text-gray-100"><code>{{ authHeaderSnippet }}</code></pre>
            <button type="button" class="absolute right-2.5 top-2.5 rounded-md bg-white/10 p-1.5 text-gray-300 opacity-0 transition-opacity hover:bg-white/20 group-hover:opacity-100" @click="copyCode(authHeaderSnippet, 'auth')">
              <Check v-if="copiedKey === 'auth'" class="h-3.5 w-3.5 text-green-400" />
              <Copy v-else class="h-3.5 w-3.5" />
            </button>
          </div>
        </section>

        <!-- Format Respons -->
        <section id="format-respons" class="scroll-mt-6 space-y-4">
          <h2 class="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Braces class="h-5 w-5 text-primary-500" /> Format Respons
          </h2>
          <p class="text-sm text-gray-600">Respons list menggunakan objek pagination di dalam <code class="font-mono text-xs">data</code>.</p>
          <div class="group relative">
            <pre class="overflow-x-auto rounded-xl bg-gray-900 px-4 py-3.5 text-[13px] leading-relaxed text-gray-100"><code>{{ listResponseSnippet }}</code></pre>
            <button type="button" class="absolute right-2.5 top-2.5 rounded-md bg-white/10 p-1.5 text-gray-300 opacity-0 transition-opacity hover:bg-white/20 group-hover:opacity-100" @click="copyCode(listResponseSnippet, 'list')">
              <Check v-if="copiedKey === 'list'" class="h-3.5 w-3.5 text-green-400" />
              <Copy v-else class="h-3.5 w-3.5" />
            </button>
          </div>

          <h3 class="pt-2 text-sm font-semibold text-gray-800">Kode Error</h3>
          <div class="overflow-hidden rounded-xl border border-gray-200">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th class="px-4 py-2.5 text-left font-medium">HTTP</th>
                  <th class="px-4 py-2.5 text-left font-medium">Body</th>
                  <th class="px-4 py-2.5 text-left font-medium">Kondisi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="e in errorCodes" :key="e.code + e.cond">
                  <td class="px-4 py-2.5"><span class="rounded bg-red-50 px-1.5 py-0.5 font-mono text-xs font-semibold text-red-600">{{ e.code }}</span></td>
                  <td class="px-4 py-2.5"><code class="font-mono text-[11px] text-gray-600">{{ e.body }}</code></td>
                  <td class="px-4 py-2.5 text-gray-600">{{ e.cond }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Parameter Query -->
        <section id="parameter" class="scroll-mt-6 space-y-4">
          <h2 class="text-lg font-bold text-gray-900">Parameter Query (Endpoint List)</h2>
          <div class="overflow-hidden rounded-xl border border-gray-200">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th class="px-4 py-2.5 text-left font-medium">Param</th>
                  <th class="px-4 py-2.5 text-left font-medium">Tipe</th>
                  <th class="px-4 py-2.5 text-left font-medium">Default</th>
                  <th class="px-4 py-2.5 text-left font-medium">Keterangan</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="p in paginationParams" :key="p.name">
                  <td class="px-4 py-2.5"><code class="font-mono text-xs text-primary-600">{{ p.name }}</code></td>
                  <td class="px-4 py-2.5 text-gray-500">{{ p.type }}</td>
                  <td class="px-4 py-2.5 text-gray-500">{{ p.def }}</td>
                  <td class="px-4 py-2.5 text-gray-600">{{ p.desc }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 class="pt-2 text-sm font-semibold text-gray-800">Filter Tanggal (orders)</h3>
          <p class="text-sm text-gray-600">
            <code class="font-mono text-xs">date_type</code> memilih kolom tanggal yang difilter &amp; diurutkan (DESC).
            <code class="font-mono text-xs">date_from</code>/<code class="font-mono text-xs">date_to</code> <strong>wajib menyertakan timezone</strong> (offset waktu) dalam format RFC3339,
            mis. <code class="font-mono text-xs">2026-07-01T00:00:00+07:00</code>.
          </p>
          <div class="overflow-hidden rounded-xl border border-gray-200">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th class="px-4 py-2.5 text-left font-medium">Nilai date_type</th>
                  <th class="px-4 py-2.5 text-left font-medium">Kolom database</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="d in dateTypes" :key="d.value">
                  <td class="px-4 py-2.5"><code class="font-mono text-xs text-primary-600">{{ d.value }}</code> <span v-if="d.note" class="text-[10px] text-gray-400">({{ d.note }})</span></td>
                  <td class="px-4 py-2.5 text-gray-600"><code class="font-mono text-xs">{{ d.col }}</code></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="group relative">
            <pre class="overflow-x-auto rounded-xl bg-gray-900 px-4 py-3.5 text-[13px] leading-relaxed text-gray-100"><code>{{ dateFilterSnippet }}</code></pre>
            <button type="button" class="absolute right-2.5 top-2.5 rounded-md bg-white/10 p-1.5 text-gray-300 opacity-0 transition-opacity hover:bg-white/20 group-hover:opacity-100" @click="copyCode(dateFilterSnippet, 'datefilter')">
              <Check v-if="copiedKey === 'datefilter'" class="h-3.5 w-3.5 text-green-400" />
              <Copy v-else class="h-3.5 w-3.5" />
            </button>
          </div>
          <p class="text-xs text-gray-500">
            Catatan encoding: karakter <code class="font-mono">+</code> pada offset timezone harus di-encode menjadi <code class="font-mono">%2B</code> di URL, mis. <code class="font-mono">date_from=2026-07-01T00:00:00%2B07:00</code>.
          </p>
        </section>

        <!-- Endpoints -->
        <section id="endpoints" class="scroll-mt-6 space-y-4">
          <h2 class="text-lg font-bold text-gray-900">Daftar Endpoint REST</h2>
          <div class="overflow-hidden rounded-xl border border-gray-200">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th class="px-4 py-2.5 text-left font-medium">Method</th>
                  <th class="px-4 py-2.5 text-left font-medium">Path</th>
                  <th class="px-4 py-2.5 text-left font-medium">Deskripsi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="ep in endpoints" :key="ep.path">
                  <td class="px-4 py-2.5">
                    <span class="rounded px-1.5 py-0.5 text-[11px] font-bold" :class="methodClass[ep.method]">{{ ep.method }}</span>
                  </td>
                  <td class="px-4 py-2.5"><code class="font-mono text-xs text-gray-700">{{ ep.path }}</code></td>
                  <td class="px-4 py-2.5 text-gray-600">{{ ep.desc }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Orders -->
        <section id="orders" class="scroll-mt-6 space-y-4">
          <h2 class="text-lg font-bold text-gray-900">Orders</h2>
          <p class="text-sm text-gray-600">
            <code class="font-mono text-xs text-primary-600">GET /api/v1/orders</code> — filter: <code class="font-mono text-xs">search</code> (nomor order),
            <code class="font-mono text-xs">status</code>, <code class="font-mono text-xs">date_type</code>, <code class="font-mono text-xs">date_from</code>, <code class="font-mono text-xs">date_to</code>.
            Detail menyertakan <code class="font-mono text-xs">items</code>, <code class="font-mono text-xs">address</code>, <code class="font-mono text-xs">shipment</code>, <code class="font-mono text-xs">payments</code>, <code class="font-mono text-xs">customer</code>, dll.
          </p>
          <div class="overflow-hidden rounded-xl border border-gray-200">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th class="px-4 py-2.5 text-left font-medium">Field</th>
                  <th class="px-4 py-2.5 text-left font-medium">Tipe</th>
                  <th class="px-4 py-2.5 text-left font-medium">Keterangan</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="f in orderFields" :key="f.name">
                  <td class="px-4 py-2.5"><code class="font-mono text-xs text-primary-600">{{ f.name }}</code></td>
                  <td class="px-4 py-2.5 text-gray-500">{{ f.type }}</td>
                  <td class="px-4 py-2.5 text-gray-600">{{ f.desc }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="text-xs text-gray-400">*Sebagian field ditampilkan. Order juga memuat banyak kolom biaya (admin_fee, cod_fee, dsb) dan timestamp status.</p>
          <h3 class="pt-1 text-sm font-semibold text-gray-800">Contoh Respons</h3>
          <div class="group relative">
            <pre class="overflow-x-auto rounded-xl bg-gray-900 px-4 py-3.5 text-[13px] leading-relaxed text-gray-100"><code>{{ orderResponseSnippet }}</code></pre>
            <button type="button" class="absolute right-2.5 top-2.5 rounded-md bg-white/10 p-1.5 text-gray-300 opacity-0 transition-opacity hover:bg-white/20 group-hover:opacity-100" @click="copyCode(orderResponseSnippet, 'orderres')">
              <Check v-if="copiedKey === 'orderres'" class="h-3.5 w-3.5 text-green-400" />
              <Copy v-else class="h-3.5 w-3.5" />
            </button>
          </div>
        </section>

        <!-- Products -->
        <section id="products" class="scroll-mt-6 space-y-4">
          <h2 class="text-lg font-bold text-gray-900">Products</h2>
          <p class="text-sm text-gray-600">
            <code class="font-mono text-xs text-primary-600">GET /api/v1/products</code> — filter: <code class="font-mono text-xs">search</code> (nama),
            <code class="font-mono text-xs">status</code> (<code class="font-mono text-xs">active</code>/<code class="font-mono text-xs">inactive</code>).
            Menyertakan relasi <code class="font-mono text-xs">skus</code> (prices, stocks) dan <code class="font-mono text-xs">category</code>.
          </p>
          <div class="overflow-hidden rounded-xl border border-gray-200">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th class="px-4 py-2.5 text-left font-medium">Field</th>
                  <th class="px-4 py-2.5 text-left font-medium">Tipe</th>
                  <th class="px-4 py-2.5 text-left font-medium">Keterangan</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="f in productFields" :key="f.name">
                  <td class="px-4 py-2.5"><code class="font-mono text-xs text-primary-600">{{ f.name }}</code></td>
                  <td class="px-4 py-2.5 text-gray-500">{{ f.type }}</td>
                  <td class="px-4 py-2.5 text-gray-600">{{ f.desc }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="text-xs text-gray-400">*Setiap SKU memuat banyak baris <code class="font-mono text-[11px]">prices</code> (satu per kategori pelanggan) dan <code class="font-mono text-[11px]">stocks</code> (satu per gudang). Contoh diringkas untuk keterbacaan.</p>
          <h3 class="pt-1 text-sm font-semibold text-gray-800">Contoh Respons</h3>
          <div class="group relative">
            <pre class="overflow-x-auto rounded-xl bg-gray-900 px-4 py-3.5 text-[13px] leading-relaxed text-gray-100"><code>{{ productResponseSnippet }}</code></pre>
            <button type="button" class="absolute right-2.5 top-2.5 rounded-md bg-white/10 p-1.5 text-gray-300 opacity-0 transition-opacity hover:bg-white/20 group-hover:opacity-100" @click="copyCode(productResponseSnippet, 'productres')">
              <Check v-if="copiedKey === 'productres'" class="h-3.5 w-3.5 text-green-400" />
              <Copy v-else class="h-3.5 w-3.5" />
            </button>
          </div>
        </section>

        <!-- Customers -->
        <section id="customers" class="scroll-mt-6 space-y-4">
          <h2 class="text-lg font-bold text-gray-900">Customers</h2>
          <p class="text-sm text-gray-600">
            <code class="font-mono text-xs text-primary-600">GET /api/v1/customers</code> — filter: <code class="font-mono text-xs">search</code> (nama, telepon, email),
            <code class="font-mono text-xs">status</code>. Menyertakan <code class="font-mono text-xs">category</code> dan <code class="font-mono text-xs">addresses</code>.
          </p>
          <div class="overflow-hidden rounded-xl border border-gray-200">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th class="px-4 py-2.5 text-left font-medium">Field</th>
                  <th class="px-4 py-2.5 text-left font-medium">Tipe</th>
                  <th class="px-4 py-2.5 text-left font-medium">Keterangan</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="f in customerFields" :key="f.name">
                  <td class="px-4 py-2.5"><code class="font-mono text-xs text-primary-600">{{ f.name }}</code></td>
                  <td class="px-4 py-2.5 text-gray-500">{{ f.type }}</td>
                  <td class="px-4 py-2.5 text-gray-600">{{ f.desc }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <h3 class="pt-1 text-sm font-semibold text-gray-800">Contoh Respons</h3>
          <div class="group relative">
            <pre class="overflow-x-auto rounded-xl bg-gray-900 px-4 py-3.5 text-[13px] leading-relaxed text-gray-100"><code>{{ customerResponseSnippet }}</code></pre>
            <button type="button" class="absolute right-2.5 top-2.5 rounded-md bg-white/10 p-1.5 text-gray-300 opacity-0 transition-opacity hover:bg-white/20 group-hover:opacity-100" @click="copyCode(customerResponseSnippet, 'customerres')">
              <Check v-if="copiedKey === 'customerres'" class="h-3.5 w-3.5 text-green-400" />
              <Copy v-else class="h-3.5 w-3.5" />
            </button>
          </div>
        </section>
 

        <!-- Webhook -->
        <section id="webhook" class="scroll-mt-6 space-y-4">
          <h2 class="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Webhook class="h-5 w-5 text-primary-500" /> Webhook Keluar (Outbound)
          </h2>
          <p class="text-sm leading-relaxed text-gray-600">
            Saat terjadi peristiwa bisnis, sistem mengirim HTTP <code class="font-mono text-xs">POST</code> ke URL webhook business
            (bila <code class="font-mono text-xs">status = active</code> dan event ter-subscribe). Balas <code class="font-mono text-xs">2xx</code> untuk sukses;
            status <code class="font-mono text-xs">&gt;= 300</code> atau timeout (15 detik) dianggap gagal. Tidak ada retry otomatis — gunakan retry manual.
          </p>

          <h3 class="text-sm font-semibold text-gray-800">Struktur Payload (Envelope)</h3>
          <div class="group relative">
            <pre class="overflow-x-auto rounded-xl bg-gray-900 px-4 py-3.5 text-[13px] leading-relaxed text-gray-100"><code>{{ envelopeSnippet }}</code></pre>
            <button type="button" class="absolute right-2.5 top-2.5 rounded-md bg-white/10 p-1.5 text-gray-300 opacity-0 transition-opacity hover:bg-white/20 group-hover:opacity-100" @click="copyCode(envelopeSnippet, 'envelope')">
              <Check v-if="copiedKey === 'envelope'" class="h-3.5 w-3.5 text-green-400" />
              <Copy v-else class="h-3.5 w-3.5" />
            </button>
          </div>

          <h3 class="pt-1 text-sm font-semibold text-gray-800">HTTP Headers</h3>
          <div class="overflow-hidden rounded-xl border border-gray-200">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th class="px-4 py-2.5 text-left font-medium">Header</th>
                  <th class="px-4 py-2.5 text-left font-medium">Contoh</th>
                  <th class="px-4 py-2.5 text-left font-medium">Keterangan</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="h in webhookHeaders" :key="h.header">
                  <td class="px-4 py-2.5"><code class="font-mono text-xs text-primary-600">{{ h.header }}</code></td>
                  <td class="px-4 py-2.5"><code class="font-mono text-[11px] text-gray-600">{{ h.example }}</code></td>
                  <td class="px-4 py-2.5 text-gray-600">{{ h.desc }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Events -->
        <section id="events" class="scroll-mt-6 space-y-4">
          <h2 class="text-lg font-bold text-gray-900">Daftar Event</h2>
          <div class="overflow-hidden rounded-xl border border-gray-200">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th class="px-4 py-2.5 text-left font-medium">Event</th>
                  <th class="px-4 py-2.5 text-left font-medium">Dipicu saat</th>
                  <th class="px-4 py-2.5 text-left font-medium">Field data</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="ev in events" :key="ev.event">
                  <td class="px-4 py-2.5"><code class="font-mono text-xs text-primary-600">{{ ev.event }}</code></td>
                  <td class="px-4 py-2.5 text-gray-600">{{ ev.trigger }}</td>
                  <td class="px-4 py-2.5"><code class="font-mono text-[11px] text-gray-500">{{ ev.data }}</code></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Signature -->
        <section id="signature" class="scroll-mt-6 space-y-4">
          <h2 class="flex items-center gap-2 text-lg font-bold text-gray-900">
            <ShieldCheck class="h-5 w-5 text-primary-500" /> Verifikasi Signature
          </h2>
          <p class="text-sm leading-relaxed text-gray-600">
            Signature dihitung <code class="font-mono text-xs">HMAC-SHA256(secret, raw_request_body)</code> lalu di-hex dengan prefix <code class="font-mono text-xs">sha256=</code>.
            Gunakan <strong>raw body</strong> (bukan hasil parse + stringify ulang) agar signature cocok.
          </p>
          <div class="overflow-hidden rounded-xl border border-gray-200 bg-gray-900">
            <div class="flex items-center gap-1 border-b border-white/10 px-2 py-2">
              <button
                v-for="l in CODE_LANGS"
                :key="l.key"
                type="button"
                class="rounded-md px-3 py-1 text-xs font-medium transition-colors"
                :class="activeLang === l.key ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-gray-200'"
                @click="activeLang = l.key"
              >
                {{ l.label }}
              </button>
            </div>
            <div class="group relative">
              <pre class="overflow-x-auto px-4 py-3.5 text-[13px] leading-relaxed text-gray-100"><code>{{ verifySamples[activeLang] }}</code></pre>
              <button type="button" class="absolute right-2.5 top-2.5 rounded-md bg-white/10 p-1.5 text-gray-300 opacity-0 transition-opacity hover:bg-white/20 group-hover:opacity-100" @click="copyCode(verifySamples[activeLang], 'verify-' + activeLang)">
                <Check v-if="copiedKey === 'verify-' + activeLang" class="h-3.5 w-3.5 text-green-400" />
                <Copy v-else class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </section>

        <!-- Sample Code -->
        <section id="sample-code" class="scroll-mt-6 space-y-4">
          <h2 class="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Terminal class="h-5 w-5 text-primary-500" /> Contoh Kode — Request API
          </h2>
          <p class="text-sm text-gray-600">Mengambil daftar order yang sudah selesai dengan API key.</p>
          <div class="overflow-hidden rounded-xl border border-gray-200 bg-gray-900">
            <div class="flex items-center gap-1 border-b border-white/10 px-2 py-2">
              <button
                v-for="l in CODE_LANGS"
                :key="l.key"
                type="button"
                class="rounded-md px-3 py-1 text-xs font-medium transition-colors"
                :class="activeLang === l.key ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-gray-200'"
                @click="activeLang = l.key"
              >
                {{ l.label }}
              </button>
            </div>
            <div class="group relative">
              <pre class="overflow-x-auto px-4 py-3.5 text-[13px] leading-relaxed text-gray-100"><code>{{ reqSamples[activeLang] }}</code></pre>
              <button type="button" class="absolute right-2.5 top-2.5 rounded-md bg-white/10 p-1.5 text-gray-300 opacity-0 transition-opacity hover:bg-white/20 group-hover:opacity-100" @click="copyCode(reqSamples[activeLang], 'req-' + activeLang)">
                <Check v-if="copiedKey === 'req-' + activeLang" class="h-3.5 w-3.5 text-green-400" />
                <Copy v-else class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
