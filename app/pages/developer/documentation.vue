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
  { id: 'ref-data', label: 'Reference Data' },
  { id: 'sales-catalog', label: 'Katalog Produk Penjualan' },
  { id: 'shipping-rates', label: 'Perhitungan Ongkir' },
  { id: 'customer-write', label: 'Customer & Alamat (Create)' },
  { id: 'order-write', label: 'Buat Order (Create)' },
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
	req, _ := http.NewRequest("GET", baseURL+"/orders?status=completed&per_page=20", nil)
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
const url = BASE_URL + "/orders?" + params.toString();

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
  const url = BASE_URL + "/orders?" + params.toString();

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

$ch = curl_init("$baseUrl/orders?$query");
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
    f"{BASE_URL}/orders",
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

const dateFilterSnippet = `GET /orders?date_type=date_completed&date_from=2026-07-01T00:00:00%2B07:00&date_to=2026-07-09T23:59:59%2B07:00&status=completed&page=1&per_page=50
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

// ---- Endpoint baru: Reference Data ----
const customerCategoriesSnippet = `{
  "message": "data retrieved successfully",
  "data": [
    { "id": "01J9...", "name": "Regular", "description": "Pelanggan umum", "discount": 0, "min_transaction": "0.00" },
    { "id": "01JA...", "name": "Reseller", "description": "Harga reseller", "discount": 10, "min_transaction": "500000.00" }
  ]
}`

const staffsSnippet = `{
  "message": "data retrieved successfully",
  "data": [
    { "id": "01J9...", "name": "Sinta CS", "email": "sinta@toko.com", "phone": "6281200000001" }
  ]
}`

const salesSourcesSnippet = `{
  "message": "data retrieved successfully",
  "data": ["Iklan Facebook", "Iklan Google", "Organik", "WhatsApp"]
}`

const paymentMethodsNewSnippet = `{
  "message": "data retrieved successfully",
  "data": [
    { "id": "01J9...", "provider": "internal", "type": "bank_transfer", "code": "bank_transfer", "name": "Transfer Bank", "category": "manual", "admin_fee": "0.00", "unique_code": 0 },
    { "id": "01JA...", "provider": "xendit", "type": "va", "code": "BCA", "name": "BCA Virtual Account", "category": "va", "admin_fee": "4000.00", "unique_code": 0 }
  ]
}`

const districtSearchRequestSnippet = `GET /district-search?search=tebet
X-Api-Key: ak_xxx`

const districtSearchResponseSnippet = `{
  "message": "data retrieved successfully",
  "data": [
    { "province": "DKI Jakarta", "city": "Jakarta Selatan", "district": "Tebet" },
    { "province": "Jawa Barat", "city": "Bandung", "district": "Cibeunying" }
  ]
}`

const zipcodesRequestSnippet = `GET /zipcodes?province=DKI%20Jakarta&city=Jakarta%20Selatan&district=Tebet
X-Api-Key: ak_xxx`

const zipcodesResponseSnippet = `{
  "message": "data retrieved successfully",
  "data": {
    "province": "DKI Jakarta",
    "city": "Jakarta Selatan",
    "district": "Tebet",
    "zipcodes": [ { "zipcode": "12810" }, { "zipcode": "12820" } ]
  }
}`

// ---- Endpoint baru: Katalog Produk Penjualan ----
const salesProductsResponseSnippet = `{
  "message": "data retrieved successfully",
  "data": { 
    "data": [
      {
        "id": "01J9...",
        "name": "Kaos Polos",
        "thumbnail": "https://.../kaos.jpg",
        "price_min": "75000.00",
        "price_max": "85000.00",
        "status": "active",
        "category": { "id": "01JC...", "name": "Atasan" },
        "stock": 120,
        "skus": [
          {
            "product_id": "01J9...",
            "sku_id": "01JD...",
            "sku": "KAOS-MERAH-M",
            "variants": { "Warna": "Merah", "Ukuran": "M" },
            "price_original": "85000.00",
            "discount": "10000.00",
            "discount_percentage": "11.76",
            "price": "75000.00",
            "image": "https://.../kaos-merah.jpg",
            "stock": 40,
            "weight": 200,
            "is_preorder": false, 
            "promotion": {
                "id": "01KY...",
                "name": "promo",
                "discount": "10000.00",
                "min_qty": 0,
                "max_qty": 0
            },
            "product_frees": []
          }
        ]
      }
    ],
    "page": 1,
    "per_page": 20,
    "total_page": 3,
    "total": 45
  }
}`

// ---- Endpoint baru: Perhitungan Ongkir ----
const shippingRatesBodySnippet = `{
  "destination_province": "DKI Jakarta",
  "destination_city": "Jakarta Selatan",
  "destination_district": "Tebet",
  "destination_zipcode": "12810",
  "weight": 1000
}`

const shippingRatesResponseSnippet = `{
  "message": "data retrieved successfully",
  "data": {
    "instant": [],
    "regular": [
      { "provider": "jne", "type": "regular", "courierName": "JNE", "courierCode": "jne",
        "serviceName": "REG", "serviceCode": "REG", "cod": true, "price": 12000, "minDuration": 2, "maxDuration": 3 }
    ],
    "express": [],
    "same_day": [],
    "cargo": []
  }
}`

const shippingRatesErrorSnippet = `{ "error": "semua field tujuan pengiriman wajib diisi" }
{ "error": "berat paket harus lebih dari 0 gram" }
{ "error": "gudang tidak ditemukan" }`

// ---- Endpoint baru: Customer & Address (write) ----
const customerCreateBodySnippet = `{
  "name": "Budi Santoso",
  "phone": "081234567890",
  "email": "budi@mail.com",
  "province": "Jawa Barat",
  "city": "Bandung",
  "district": "Coblong",
  "zipcode": "40132",
  "address": "Jl. Dago No. 10"
}`

const customerCreateResponseSnippet = `{
  "message": "new data successfully created",
  "data": {
    "id": "01JF...",
    "business_id": "01J0...",
    "store_id": "01J1...",
    "customer_category_id": "01J2...",
    "external_id": "",
    "name": "Budi Santoso",
    "phone": "6281234567890",
    "email": "budi@mail.com",
    "username": "",
    "type": "customer",
    "status": "active",
    "login_status": "offline",
    "created_at": "2026-07-29T10:00:00+07:00",
    "updated_at": "2026-07-29T10:00:00+07:00",
    "category": { "id": "01J2...", "name": "Regular" },
    "addresses": [
      { "id": "01JG...", "customer_id": "01JF...", "name": "Budi Santoso", "phone": "6281234567890",
        "address": "Jl. Dago No. 10", "country": "Indonesia", "province": "Jawa Barat", "city": "Bandung",
        "district": "Coblong", "zipcode": "40132", "primary": true,
        "created_at": "2026-07-29T10:00:00+07:00", "updated_at": "2026-07-29T10:00:00+07:00" }
    ]
  }
}`

const customerUpdateBodySnippet = `{ "name": "Budi S.", "phone": "081234567891", "email": "budi.s@mail.com" }`

const customerUpdateResponseSnippet = `{ "message": "data successfully updated", "data": null }`

const addressCreateBodySnippet = `{
  "customer_id": "01JF...",
  "name": "Budi Santoso",
  "phone": "081234567890",
  "province": "Jawa Barat",
  "city": "Bandung",
  "district": "Coblong",
  "zipcode": "40132",
  "address": "Jl. Dago No. 10"
}`

const addressCreateResponseSnippet = `{
  "message": "new data successfully created",
  "data": {
    "id": "01JG...", "customer_id": "01JF...", "name": "Budi Santoso", "phone": "6281234567890",
    "address": "Jl. Dago No. 10", "country": "Indonesia", "province": "Jawa Barat", "city": "Bandung",
    "district": "Coblong", "zipcode": "40132", "primary": false,
    "created_at": "2026-07-29T10:05:00+07:00", "updated_at": "2026-07-29T10:05:00+07:00"
  }
}`

// ---- Endpoint baru: Buat Order (write) ----
const orderCreateBodySnippet = `{
  "payment_provider": "xendit",
  "payment_method": "BCA",
  "shipping_cost": "12000",
  "tags": ["cmr", "member"],
  "items": [
    { "sku_id": "01JD...", "qty": 2, "price": "75000", "discount": "0", "weight": 200, "is_free": "no" }
  ],
  "address": {
    "customer_id": "01JF...",
    "name": "Budi Santoso",
    "phone": "6281234567890",
    "country": "Indonesia",
    "province": "Jawa Barat",
    "city": "Bandung",
    "district": "Coblong",
    "address": "Jl. Dago No. 10",
    "zipcode": "40132"
  },
  "shipment": {
    "courier_code": "jne",
    "courier_name": "JNE",
    "service_code": "REG",
    "service_name": "Reguler",
    "price": "12000"
  }
}`

const orderCreateResponseSnippet = `{
  "message": "new data successfully created",
  "data": {
    "id": "01JH...",
    "no": "ORD-20260729-0001",
    "date_created": "2026-07-29T10:10:00+07:00",
    "total": "162000.00",
    "payment_total": "162000.00",
    "status": "pending",
    "payment_status": "unpaid",
    "payment_provider": "xendit",
    "payment_method": "BCA",
    "cod": "no",
    "xendit": {
      "id": "01JI...", "external_id": "01JH...", "amount": 162000,
      "method": "BCA", "bank_name": "BCA", "account_number": "8808123456", "account_name": "PT Toko",
      "qris": "", "url": "https://checkout.xendit.co/...", "type": "va", "status": "pending"
    }
  }
}`

// ---- Reference tables ----
const endpoints = [
  { method: 'GET', path: '/orders', desc: 'List order.' },
  { method: 'GET', path: '/orders/:id', desc: 'Detail order (items, address, shipment, payments, dll).' },
  { method: 'GET', path: '/products', desc: 'List produk.' },
  { method: 'GET', path: '/products/:id', desc: 'Detail produk (skus, prices, stocks, category).' },
  { method: 'GET', path: '/customers', desc: 'List customer.' },
  { method: 'GET', path: '/customers/:id', desc: 'Detail customer (category, addresses).' },
  { method: 'GET', path: '/customer-categories', desc: 'Daftar kategori pelanggan.' },
  { method: 'GET', path: '/staffs', desc: 'Daftar staff CS (is_cs = true).' },
  { method: 'GET', path: '/sales-sources', desc: 'Daftar sumber penjualan business.' },
  { method: 'GET', path: '/payment-methods', desc: 'Daftar metode pembayaran aktif business.' },
  { method: 'GET', path: '/district-search', desc: 'Cari kecamatan berdasarkan nama.' },
  { method: 'GET', path: '/zipcodes', desc: 'Daftar kode pos provinsi/kota/kecamatan.' },
  { method: 'GET', path: '/sales-products', desc: 'Katalog produk penjualan (harga per kategori & stok gudang).' },
  { method: 'POST', path: '/shipping-rates', desc: 'Hitung ongkir dari gudang utama ke alamat tujuan.' },
  { method: 'POST', path: '/customers/create', desc: 'Buat pelanggan baru beserta alamat primary.' },
  { method: 'PUT', path: '/customers/:id', desc: 'Perbarui data dasar pelanggan.' },
  { method: 'POST', path: '/addresses/create', desc: 'Tambah alamat untuk pelanggan yang sudah ada.' },
  { method: 'PUT', path: '/addresses/:id', desc: 'Perbarui alamat.' },
  { method: 'POST', path: '/orders/create', desc: 'Buat order penjualan.' },
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
  { code: '429', body: '{ "error": "rate limit exceeded" }', cond: 'Melebihi batas rate limiter (read/create) per menit.' },
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

// ---- Reference Data (read-only) ----
const customerCategoryFields = [
  { name: 'id', type: 'string', desc: 'ID kategori (ULID).' },
  { name: 'name', type: 'string', desc: 'Nama kategori.' },
  { name: 'description', type: 'string', desc: 'Deskripsi.' },
  { name: 'discount', type: 'int', desc: 'Diskon default kategori (%).' },
  { name: 'min_transaction', type: 'string(decimal)', desc: 'Minimum transaksi.' },
]

const staffFields = [
  { name: 'id', type: 'string', desc: 'ID user.' },
  { name: 'name', type: 'string', desc: 'Nama staff.' },
  { name: 'email', type: 'string', desc: 'Email.' },
  { name: 'phone', type: 'string', desc: 'Nomor telepon.' },
]

const paymentMethodNewFields = [
  { name: 'id', type: 'string', desc: 'ID metode.' },
  { name: 'provider', type: 'string', desc: 'internal / xendit / midtrans.' },
  { name: 'type', type: 'string', desc: 'Tipe (mis. bank_transfer, va, ewallet, qris, cod).' },
  { name: 'code', type: 'string', desc: 'Kode metode (mis. bca_va, qris).' },
  { name: 'name', type: 'string', desc: 'Nama tampilan.' },
  { name: 'category', type: 'string', desc: 'Kategori metode.' },
  { name: 'admin_fee', type: 'string(decimal)', desc: 'Biaya admin yang di-set business.' },
  { name: 'unique_code', type: 'int64', desc: 'Kode unik (untuk bank transfer).' },
]

const districtSearchParams = [
  { name: 'search', type: 'string', req: '✅', desc: 'Kata kunci nama kecamatan.' },
]

const zipcodeParams = [
  { name: 'province', type: 'string', req: '✅', desc: 'Nama provinsi.' },
  { name: 'city', type: 'string', req: '✅', desc: 'Nama kota.' },
  { name: 'district', type: 'string', req: '✅', desc: 'Nama kecamatan.' },
]

const zipcodeErrorFields = [
  { field: 'province', msg: 'provinsi wajib diisi' },
  { field: 'city', msg: 'kota wajib diisi' },
  { field: 'district', msg: 'kecamatan wajib diisi' },
]

const districtSearchErrorFields = [
  { field: 'search', msg: 'kata kunci pencarian wajib diisi' },
]

// ---- Katalog Produk Penjualan ----
const salesProductsParams = [
  { name: 'page', type: 'int', def: '1', desc: 'Halaman.' },
  { name: 'per_page', type: 'int', def: '20', desc: 'Item per halaman.' },
  { name: 'search', type: 'string', def: '-', desc: 'Cari di nama/deskripsi/SKU.' },
  { name: 'search_type', type: 'string', def: '✅', desc: 'Tipe pencarian (product/sku).' },
  { name: 'customer_category_id', type: 'string', def: '✅', desc: 'Kategori pelanggan untuk menentukan harga (skus[].price).' },
  // { name: 'warehouse_id', type: 'string', def: 'gudang utama', desc: 'Gudang sumber stok. Kosong → gudang utama business.' },
  { name: 'is_preorder', type: 'bool', def: 'false', desc: 'true = hanya SKU preorder.' },
  // { name: 'hide_out_of_stock', type: 'bool', def: 'false', desc: 'true = sembunyikan SKU stok 0.' },
]

const salesProductFields = [
  { name: 'id', type: 'string', desc: 'ID produk.' },
  { name: 'name', type: 'string', desc: 'Nama produk.' },
  { name: 'thumbnail', type: 'string', desc: 'URL thumbnail.' },
  { name: 'price_min', type: 'string(decimal)', desc: 'Harga termurah.' },
  { name: 'price_max', type: 'string(decimal)', desc: 'Harga termahal.' },
  { name: 'status', type: 'string', desc: 'active.' },
  { name: 'category', type: 'object', desc: '{ id, name }.' },
  { name: 'stock', type: 'int64', desc: 'Total stok produk di gudang.' },
  { name: 'skus', type: 'array', desc: 'Daftar SKU (lihat tabel di bawah).' },
]

const salesProductSkuFields = [
  { name: 'product_id', type: 'string', desc: 'ID produk induk.' },
  { name: 'sku_id', type: 'string', desc: 'ID SKU.' },
  { name: 'sku', type: 'string', desc: 'Kode SKU.' },
  { name: 'variants', type: 'json', desc: 'Varian, mis. { "Warna": "Merah", "Ukuran": "M" }.' },
  { name: 'price_original', type: 'string(decimal)', desc: 'Harga sebelum diskon.' },
  { name: 'discount', type: 'string(decimal)', desc: 'Nilai diskon.' },
  { name: 'discount_percentage', type: 'string(decimal)', desc: 'Persentase diskon.' },
  { name: 'price', type: 'string(decimal)', desc: 'Harga akhir (sesuai customer_category_id).' },
  { name: 'image', type: 'string', desc: 'URL gambar SKU.' },
  { name: 'stock', type: 'int64', desc: 'Stok SKU di gudang.' },
  { name: 'weight', type: 'int64', desc: 'Berat (gram).' },
  { name: 'is_preorder', type: 'bool', desc: 'Preorder atau tidak.' },
  { name: 'promotion', type: 'object', desc: 'Data promosi yang menempel pada SKU.' },
  { name: 'product_frees', type: 'array', desc: 'Produk gratis dari promosi (opsional).' },
]

// ---- Perhitungan Ongkir ----
const shippingRatesBodyFields = [
  { name: 'destination_province', type: 'string', req: '✅', desc: 'Provinsi tujuan.' },
  { name: 'destination_city', type: 'string', req: '✅', desc: 'Kota tujuan.' },
  { name: 'destination_district', type: 'string', req: '✅', desc: 'Kecamatan tujuan.' },
  { name: 'destination_zipcode', type: 'string', req: '✅', desc: 'Kode pos tujuan.' },
  { name: 'weight', type: 'int', req: '✅', desc: 'Berat total (gram), harus > 0.' },
]

const shippingRatesGroups = [
  { name: 'instant', type: 'array<Ongkir>', desc: 'Layanan instan.' },
  { name: 'regular', type: 'array<Ongkir>', desc: 'Layanan reguler.' },
  { name: 'express', type: 'array<Ongkir>', desc: 'Layanan ekspres.' },
  { name: 'same_day', type: 'array<Ongkir>', desc: 'Layanan same-day.' },
  { name: 'cargo', type: 'array<Ongkir>', desc: 'Layanan kargo.' },
]

const shippingRatesItemFields = [
  { name: 'provider', type: 'string', desc: 'Provider/aggregator.' },
  { name: 'type', type: 'string', desc: 'Tipe layanan.' },
  { name: 'courierName', type: 'string', desc: 'Nama kurir.' },
  { name: 'courierCode', type: 'string', desc: 'Kode kurir.' },
  { name: 'serviceName', type: 'string', desc: 'Nama layanan.' },
  { name: 'serviceCode', type: 'string', desc: 'Kode layanan.' },
  { name: 'cod', type: 'bool', desc: 'Mendukung COD.' },
  { name: 'price', type: 'number', desc: 'Tarif.' },
  { name: 'minDuration', type: 'int', desc: 'Estimasi durasi minimum (hari).' },
  { name: 'maxDuration', type: 'int', desc: 'Estimasi durasi maksimum (hari).' },
]

// ---- Customer & Address (write) ----
const customerCreateBodyFields = [
  { name: 'external_id', req: '➖', desc: 'ID eksternal (opsional).' },
  { name: 'name', req: '✅', desc: 'Nama pelanggan.' },
  { name: 'phone', req: '✅', desc: 'Nomor telepon.' },
  { name: 'email', req: '➖', desc: 'Email (divalidasi + cek duplikat bila diisi).' },
  { name: 'province', req: '✅', desc: 'Provinsi alamat.' },
  { name: 'city', req: '✅', desc: 'Kota alamat.' },
  { name: 'district', req: '✅', desc: 'Kecamatan alamat.' },
  { name: 'zipcode', req: '✅', desc: 'Kode pos alamat.' },
  { name: 'address', req: '✅', desc: 'Alamat lengkap.' },
  { name: 'country', req: '✅', desc: '"Indonesia".' },
  // { name: 'customer_id', req: '➖', desc: 'Diabaikan pada create.' },
]

const customerCreateResponseFields = [
  { name: 'id', desc: 'ID pelanggan.' },
  { name: 'business_id', desc: 'ID business.' },
  { name: 'store_id', desc: 'Store internal.' },
  { name: 'customer_category_id', desc: 'Kategori (Regular).' },
  { name: 'external_id', desc: 'ID eksternal.' },
  { name: 'name', desc: 'Nama.' },
  { name: 'phone', desc: 'Telepon (ternormalisasi, mis. 628...).' },
  { name: 'email', desc: 'Email.' },
  { name: 'username', desc: 'Username.' },
  { name: 'type', desc: 'customer.' },
  { name: 'status', desc: 'active.' },
  { name: 'login_status', desc: 'Status login.' },
  { name: 'created_at / updated_at', desc: 'Timestamp.' },
  { name: 'category', desc: '{ id, name }.' },
  { name: 'addresses', desc: 'Daftar alamat (CustomerAddress).' },
]

const customerCreateErrorFields = [
  { field: 'name', msg: 'nama pelanggan wajib diisi' },
  { field: 'phone', msg: 'nomor telepon tidak valid' },
  { field: 'email', msg: 'email tidak valid / email sudah terdaftar' },
  { field: 'province', msg: 'provinsi wajib diisi' },
  { field: 'city', msg: 'kota wajib diisi' },
  { field: 'district', msg: 'kecamatan wajib diisi' },
  { field: 'address', msg: 'alamat wajib diisi' },
  { field: 'zipcode', msg: 'kode pos wajib diisi' },
]

const customerUpdateBodyFields = [
  { name: 'name', req: '✅', desc: 'Nama pelanggan.' },
  { name: 'phone', req: '✅', desc: 'Nomor telepon.' },
  { name: 'email', req: '➖', desc: 'Divalidasi + cek duplikat bila diisi.' },
]

const customerUpdateErrorFields = [
  { field: 'name', msg: 'nama pelanggan wajib diisi' },
  { field: 'phone', msg: 'nomor telepon tidak valid / nomor telepon sudah digunakan' },
  { field: 'email', msg: 'email tidak valid / email sudah terdaftar' },
  { field: 'username', msg: 'username sudah digunakan' },
]

const addressBodyFields = [
  { name: 'customer_id', req: '✅*', desc: 'ID pelanggan pemilik alamat. *Wajib saat create; opsional saat update untuk mengatur ulang alamat primary.' },
  { name: 'name', req: '✅', desc: 'Nama penerima.' },
  { name: 'phone', req: '✅', desc: 'Telepon (divalidasi).' },
  { name: 'province', req: '✅', desc: 'Provinsi.' },
  { name: 'city', req: '✅', desc: 'Kota.' },
  { name: 'district', req: '✅', desc: 'Kecamatan.' },
  { name: 'zipcode', req: '✅', desc: 'Kode pos.' },
  { name: 'address', req: '✅', desc: 'Alamat lengkap.' },
  { name: 'country', req: '➖', desc: 'Diabaikan, dipaksa "Indonesia".' },
]

const addressResponseFields = [
  { name: 'id', type: 'string' },
  { name: 'customer_id', type: 'string' },
  { name: 'name', type: 'string' },
  { name: 'phone', type: 'string' },
  { name: 'address', type: 'string' },
  { name: 'country', type: 'string' },
  { name: 'province', type: 'string' },
  { name: 'city', type: 'string' },
  { name: 'district', type: 'string' },
  { name: 'zipcode', type: 'string' },
  { name: 'primary', type: 'bool' },
  { name: 'created_at / updated_at', type: 'datetime' },
]

const addressCreateErrorFields = [
  { field: 'name', msg: 'nama wajib diisi' },
  { field: 'phone', msg: 'telepon wajib diisi / telepon tidak valid' },
  { field: 'province', msg: 'provinsi wajib diisi' },
  { field: 'city', msg: 'kota wajib diisi' },
  { field: 'district', msg: 'kecamatan wajib diisi' },
  { field: 'zipcode', msg: 'kode pos wajib diisi' },
  { field: 'address', msg: 'alamat wajib diisi' },
]

// ---- Buat Order (write) ----
const orderCreateBodyFields = [
  // { name: 'warehouse_id', req: '➖', desc: 'Kosong → gudang utama.' },
  // { name: 'store_id', req: '➖', desc: 'Kosong → store internal.' },
  { name: 'external_id', req: '➖', desc: 'ID eksternal (idempotensi milik Anda).' },
  { name: 'staff_id', req: '➖', desc: 'ID staff (harus valid bila diisi).' },
  // { name: 'no', req: '➖', desc: 'Nomor order (auto-generate bila kosong; harus unik).' },
  // { name: 'date_created', req: '➖', desc: 'YYYY-MM-DD HH:MM:SS; kosong → sekarang.' },
  // { name: 'date_due', req: '➖', desc: 'YYYY-MM-DD HH:MM:SS; kosong → +24 jam.' },
  { name: 'payment_provider', req: '✅', desc: 'internal / midtrans / xendit.' },
  { name: 'payment_method', req: '✅', desc: 'Sesuai provider (lihat tabel di bawah).' },
  { name: 'shipping_cost', req: '✅', desc: 'Ongkir.' },
  { name: 'shipping_discount', req: '✅', desc: 'Diskon ongkir.' },
  { name: 'cod_cost', req: '✅', desc: 'Biaya COD.' },
  { name: 'adjustment', req: '✅', desc: 'Penyesuaian.' },
  { name: 'tax', req: '✅', desc: 'Pajak.' },
  { name: 'note', req: '➖', desc: 'Catatan internal.' },
  { name: 'customer_note', req: '➖', desc: 'Catatan pelanggan.' },
  { name: 'tags', req: '➖', desc: 'Tag tambahan (otomatis ditambah "api" di depan).' },
  { name: 'source', req: '➖', desc: 'Sumber order.' },
  { name: 'items', req: '✅', desc: 'Item order (lihat tabel di bawah).' },
  { name: 'address', req: '✅', desc: 'Alamat + customer_id (lihat tabel di bawah).' },
  { name: 'shipment', req: '✅', desc: 'Data kurir (lihat tabel di bawah).' },
  { name: 'promotion_checkout', req: '➖', desc: 'Promo checkout { id, code, discount_value }.' },
  { name: 'promotion_shipping', req: '➖', desc: 'Promo ongkir.' },
]

const paymentMethodProviderTable = [
  { provider: 'internal', values: 'bank_transfer, cod' },
  { provider: 'xendit', values: 'ALL, QRIS, OVO, DANA, SHOPEEPAY, LINKAJA, BCA, MANDIRI, BNI, BRI, BSI, CIMB, PERMATA, BJB' },
  { provider: 'midtrans', values: 'ALL, qris, ovo, dana, shopeepay, gopay, bca_va, bni_va, bri_va, mandiri_va, permata_va, cimb_va, danamon_va, bsi_va, maybank_va, seabank_va' },
]

const orderItemFields = [
  { name: 'sku_id', req: '✅', desc: 'ID SKU (harus ada, tidak boleh duplikat antar item).' },
  { name: 'qty', req: '✅', desc: 'Jumlah (stok harus cukup).' },
  { name: 'price', req: '✅', desc: 'Harus sama dengan harga kategori pelanggan; abaikan/0 bila is_free = "yes".' },
  { name: 'discount', req: '➖', desc: 'Diskon item; harus sesuai promo bila promotion_id diisi.' },
  { name: 'weight', req: '➖', desc: 'Berat item (gram).' },
  { name: 'promotion_id', req: '➖', desc: 'ID promo diskon produk.' },
  { name: 'is_free', req: '➖', desc: 'yes / no (produk gratis).' },
]

const orderAddressFields = [
  { name: 'customer_id', req: '✅', desc: 'Dipakai sebagai customer order.' },
  { name: 'name', req: '✅', desc: '—' },
  { name: 'phone', req: '✅', desc: '—' },
  { name: 'country', req: '✅', desc: '—' },
  { name: 'province', req: '✅', desc: '—' },
  { name: 'city', req: '✅', desc: '—' },
  { name: 'district', req: '✅', desc: '—' },
  { name: 'address', req: '✅', desc: '—' },
  { name: 'zipcode', req: '✅', desc: '—' },
]

const orderShipmentFields = [
  { name: 'courier_code', req: '✅', desc: 'Kode kurir.' },
  { name: 'courier_name', req: '✅', desc: 'Nama kurir.' },
  { name: 'service_code', req: '✅', desc: 'Kode layanan.' },
  { name: 'service_name', req: '✅', desc: 'Nama layanan.' },
  { name: 'price', req: '➖', desc: 'Tarif.' },
  { name: 'discount', req: '➖', desc: 'Diskon.' },
  { name: 'tracking_no', req: '➖', desc: 'Nomor resi.' },
]

const orderCreateResponseFields = [
  { name: 'id', desc: 'ID order.' },
  { name: 'no', desc: 'Nomor order.' },
  { name: 'date_created', desc: 'Tanggal dibuat.' },
  { name: 'total', desc: 'Total order.' },
  { name: 'payment_total', desc: 'Total yang harus dibayar.' },
  { name: 'status', desc: 'Status (mis. pending).' },
  { name: 'payment_status', desc: 'unpaid / paid.' },
  { name: 'payment_provider', desc: 'Provider.' },
  { name: 'payment_method', desc: 'Metode.' },
  { name: 'cod', desc: 'yes / no.' },
  { name: 'xendit', desc: 'Detail invoice Xendit (hanya bila provider xendit).' },
]

const orderCreateErrorFields = [
  { field: 'warehouse_id', msg: 'gagal mendapatkan gudang utama / gudang tidak ditemukan' },
  { field: 'store_id', msg: 'gagal mendapatkan toko internal / toko tidak ditemukan' },
  { field: 'staff_id', msg: 'staff tidak ditemukan' },
  { field: 'no', msg: 'no sudah ada' },
  { field: 'external_id', msg: 'external_id sudah digunakan' },
  { field: 'date_created', msg: 'format date_created salah, gunakan format YYYY-MM-DD HH:MM:SS' },
  { field: 'date_due', msg: 'format date_due salah, gunakan format YYYY-MM-DD HH:MM:SS' },
  { field: 'payment_provider', msg: 'metode pembayaran tidak valid' },
  { field: 'payment_method', msg: 'metode pembayaran tidak valid' },
  { field: 'customer', msg: 'pelanggan harus diisi / pelanggan tidak ditemukan / kategori pelanggan tidak ditemukan' },
  { field: 'address.name', msg: 'nama penerima harus diisi' },
  { field: 'address.phone', msg: 'nomor telepon penerima harus diisi' },
  { field: 'address.country', msg: 'negara harus diisi' },
  { field: 'address.province', msg: 'provinsi harus diisi' },
  { field: 'address.city', msg: 'kota harus diisi' },
  { field: 'address.district', msg: 'kecamatan harus diisi' },
  { field: 'address.address', msg: 'alamat harus diisi' },
  { field: 'address.zipcode', msg: 'kode pos harus diisi' },
  { field: 'shipment', msg: 'data kurir tidak lengkap' },
  { field: 'items', msg: 'produk tidak boleh kosong' },
  { field: 'items[i].sku', msg: 'produk tidak ditemukan / produk duplikat' },
  { field: 'items[i].price', msg: 'harga tidak sesuai' },
  { field: 'items[i].qty', msg: 'stok tidak cukup (tersedia: N)' },
  { field: 'items[i].discount', msg: 'nilai diskon tidak sesuai dengan promosi (expected: X)' },
  { field: 'items[i].promotion_id', msg: 'promosi diskon produk tidak ditemukan atau tidak aktif' },
  { field: 'promotion_checkout', msg: '<pesan promo> / nilai diskon tidak sesuai dengan promosi (expected: X)' },
  { field: 'promotion_shipping', msg: '<pesan promo> / nilai diskon tidak sesuai dengan promosi (expected: X)' },
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
        to="/developer/api-logs"
        class="border-b-2 border-transparent px-4 py-2.5 text-sm font-semibold text-gray-500 transition-colors hover:text-gray-700"
      >
        API Logs
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
                  <td class="px-4 py-2.5 text-gray-700">REST API publik</td>
                  <td class="px-4 py-2.5"><code class="font-mono text-xs text-primary-600">https://public.api.arafahijab.co.id</code></td>
                  <td class="px-4 py-2.5 text-gray-600">API Key (<code class="font-mono text-xs">X-Api-Key</code>)</td>
                </tr> 
              </tbody>
            </table>
          </div>
          <div class="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <p><strong>Base URL:</strong> <code class="font-mono text-xs"><b>https://public.api.arafahijab.co.id</b></code><br/>
                contoh endpoint order: <code class="font-mono text-xs">https://public.api.arafahijab.co.id/orders</code>.</p>
            <p class="mt-1">Semua request/response memakai <code class="font-mono text-xs">application/json</code>.</p>
          </div>

          <h3 class="pt-2 text-sm font-semibold text-gray-800">Rate Limiter</h3>
          <p class="text-sm text-gray-600">
            Setiap API key dibatasi jumlah permintaannya per menit, dihitung terpisah menurut jenis operasi (scope). Melebihi batas akan menghasilkan respons <code class="font-mono text-xs">429</code>.
          </p>
          <div class="overflow-hidden rounded-xl border border-gray-200">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th class="px-4 py-2.5 text-left font-medium">Jenis Operasi</th>
                  <th class="px-4 py-2.5 text-left font-medium">Batas</th>
                  <th class="px-4 py-2.5 text-left font-medium">Keterangan</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr>
                  <td class="px-4 py-2.5"><span class="rounded px-1.5 py-0.5 text-[11px] font-bold" :class="methodClass.GET">read</span></td>
                  <td class="px-4 py-2.5 font-mono text-xs text-gray-700">1000 request/menit</td>
                  <td class="px-4 py-2.5 text-gray-600">Berlaku untuk endpoint <code class="font-mono text-xs">GET</code> (list/detail data).</td>
                </tr>
                <tr>
                  <td class="px-4 py-2.5"><span class="rounded px-1.5 py-0.5 text-[11px] font-bold" :class="methodClass.POST">create</span></td>
                  <td class="px-4 py-2.5 font-mono text-xs text-gray-700">120 request/menit</td>
                  <td class="px-4 py-2.5 text-gray-600">Berlaku untuk endpoint <code class="font-mono text-xs">POST</code>/<code class="font-mono text-xs">PUT</code> (tulis data, mis. buat order, buat pelanggan, hitung ongkir).</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Autentikasi -->
        <section id="autentikasi" class="scroll-mt-6 space-y-4">
          <h2 class="flex items-center gap-2 text-lg font-bold text-gray-900">
            <KeyRound class="h-5 w-5 text-primary-500" /> Autentikasi
          </h2>
          <p class="text-sm leading-relaxed text-gray-600">
            Setiap request ke endpoint publik wajib menyertakan API key melalui salah satu header berikut.
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
            <code class="font-mono text-xs text-primary-600">GET /orders</code> — filter: <code class="font-mono text-xs">search</code> (nomor order),
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
            <code class="font-mono text-xs text-primary-600">GET /products</code> — filter: <code class="font-mono text-xs">search</code> (nama),
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
            <code class="font-mono text-xs text-primary-600">GET /customers</code> — filter: <code class="font-mono text-xs">search</code> (nama, telepon, email),
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

        <!-- Reference Data -->
        <section id="ref-data" class="scroll-mt-6 space-y-6">
          <h2 class="text-lg font-bold text-gray-900">Reference Data (Read-only)</h2>
          <p class="text-sm leading-relaxed text-gray-600">
            Endpoint bantu untuk mengisi form (kategori pelanggan, staff CS, sumber penjualan, metode pembayaran, pencarian kecamatan &amp; kode pos).
            Semua tanpa parameter kecuali disebutkan.
          </p>

          <!-- customer-categories -->
          <div class="space-y-3">
            <h3 class="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <span class="rounded px-1.5 py-0.5 text-[11px] font-bold" :class="methodClass.GET">GET</span>
              <code class="font-mono text-xs text-primary-600">/customer-categories</code>
            </h3>
            <p class="text-sm text-gray-600">Daftar kategori pelanggan business. Tidak ada parameter.</p>
            <div class="overflow-hidden rounded-xl border border-gray-200">
              <table class="w-full text-sm">
                <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr><th class="px-4 py-2.5 text-left font-medium">Field</th><th class="px-4 py-2.5 text-left font-medium">Tipe</th><th class="px-4 py-2.5 text-left font-medium">Keterangan</th></tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="f in customerCategoryFields" :key="f.name">
                    <td class="px-4 py-2.5"><code class="font-mono text-xs text-primary-600">{{ f.name }}</code></td>
                    <td class="px-4 py-2.5 text-gray-500">{{ f.type }}</td>
                    <td class="px-4 py-2.5 text-gray-600">{{ f.desc }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="group relative">
              <pre class="overflow-x-auto rounded-xl bg-gray-900 px-4 py-3.5 text-[13px] leading-relaxed text-gray-100"><code>{{ customerCategoriesSnippet }}</code></pre>
              <button type="button" class="absolute right-2.5 top-2.5 rounded-md bg-white/10 p-1.5 text-gray-300 opacity-0 transition-opacity hover:bg-white/20 group-hover:opacity-100" @click="copyCode(customerCategoriesSnippet, 'customercats')">
                <Check v-if="copiedKey === 'customercats'" class="h-3.5 w-3.5 text-green-400" />
                <Copy v-else class="h-3.5 w-3.5" />
              </button>
            </div>
            <p class="text-xs text-gray-400">Error: <code class="font-mono text-[11px]">401</code> (API key tidak valid), <code class="font-mono text-[11px]">500</code> (error server).</p>
          </div>

          <!-- staffs -->
          <div class="space-y-3">
            <h3 class="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <span class="rounded px-1.5 py-0.5 text-[11px] font-bold" :class="methodClass.GET">GET</span>
              <code class="font-mono text-xs text-primary-600">/staffs</code>
            </h3>
            <p class="text-sm text-gray-600">Daftar staff CS (<code class="font-mono text-xs">is_cs = true</code>). Tidak ada parameter.</p>
            <div class="overflow-hidden rounded-xl border border-gray-200">
              <table class="w-full text-sm">
                <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr><th class="px-4 py-2.5 text-left font-medium">Field</th><th class="px-4 py-2.5 text-left font-medium">Tipe</th><th class="px-4 py-2.5 text-left font-medium">Keterangan</th></tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="f in staffFields" :key="f.name">
                    <td class="px-4 py-2.5"><code class="font-mono text-xs text-primary-600">{{ f.name }}</code></td>
                    <td class="px-4 py-2.5 text-gray-500">{{ f.type }}</td>
                    <td class="px-4 py-2.5 text-gray-600">{{ f.desc }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="group relative">
              <pre class="overflow-x-auto rounded-xl bg-gray-900 px-4 py-3.5 text-[13px] leading-relaxed text-gray-100"><code>{{ staffsSnippet }}</code></pre>
              <button type="button" class="absolute right-2.5 top-2.5 rounded-md bg-white/10 p-1.5 text-gray-300 opacity-0 transition-opacity hover:bg-white/20 group-hover:opacity-100" @click="copyCode(staffsSnippet, 'staffs')">
                <Check v-if="copiedKey === 'staffs'" class="h-3.5 w-3.5 text-green-400" />
                <Copy v-else class="h-3.5 w-3.5" />
              </button>
            </div>
            <p class="text-xs text-gray-400">Error: <code class="font-mono text-[11px]">401</code>, <code class="font-mono text-[11px]">500</code>.</p>
          </div>

          <!-- sales-sources -->
          <div class="space-y-3">
            <h3 class="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <span class="rounded px-1.5 py-0.5 text-[11px] font-bold" :class="methodClass.GET">GET</span>
              <code class="font-mono text-xs text-primary-600">/sales-sources</code>
            </h3>
            <p class="text-sm text-gray-600">
              Daftar sumber penjualan (opsi business <code class="font-mono text-xs">sales-source</code>). Respons <code class="font-mono text-xs">data</code> berupa array string mentah, bukan objek.
            </p>
            <div class="group relative">
              <pre class="overflow-x-auto rounded-xl bg-gray-900 px-4 py-3.5 text-[13px] leading-relaxed text-gray-100"><code>{{ salesSourcesSnippet }}</code></pre>
              <button type="button" class="absolute right-2.5 top-2.5 rounded-md bg-white/10 p-1.5 text-gray-300 opacity-0 transition-opacity hover:bg-white/20 group-hover:opacity-100" @click="copyCode(salesSourcesSnippet, 'salessources')">
                <Check v-if="copiedKey === 'salessources'" class="h-3.5 w-3.5 text-green-400" />
                <Copy v-else class="h-3.5 w-3.5" />
              </button>
            </div>
            <p class="text-xs text-gray-400">Error: <code class="font-mono text-[11px]">500</code> bila opsi sumber penjualan belum dikonfigurasi.</p>
          </div>

          <!-- payment-methods -->
          <div class="space-y-3">
            <h3 class="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <span class="rounded px-1.5 py-0.5 text-[11px] font-bold" :class="methodClass.GET">GET</span>
              <code class="font-mono text-xs text-primary-600">/payment-methods</code>
            </h3>
            <p class="text-sm text-gray-600">Daftar metode pembayaran yang aktif untuk business. Tidak ada parameter.</p>
            <div class="overflow-hidden rounded-xl border border-gray-200">
              <table class="w-full text-sm">
                <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr><th class="px-4 py-2.5 text-left font-medium">Field</th><th class="px-4 py-2.5 text-left font-medium">Tipe</th><th class="px-4 py-2.5 text-left font-medium">Keterangan</th></tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="f in paymentMethodNewFields" :key="f.name">
                    <td class="px-4 py-2.5"><code class="font-mono text-xs text-primary-600">{{ f.name }}</code></td>
                    <td class="px-4 py-2.5 text-gray-500">{{ f.type }}</td>
                    <td class="px-4 py-2.5 text-gray-600">{{ f.desc }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="group relative">
              <pre class="overflow-x-auto rounded-xl bg-gray-900 px-4 py-3.5 text-[13px] leading-relaxed text-gray-100"><code>{{ paymentMethodsNewSnippet }}</code></pre>
              <button type="button" class="absolute right-2.5 top-2.5 rounded-md bg-white/10 p-1.5 text-gray-300 opacity-0 transition-opacity hover:bg-white/20 group-hover:opacity-100" @click="copyCode(paymentMethodsNewSnippet, 'paymentmethodsnew')">
                <Check v-if="copiedKey === 'paymentmethodsnew'" class="h-3.5 w-3.5 text-green-400" />
                <Copy v-else class="h-3.5 w-3.5" />
              </button>
            </div>
            <p class="text-xs text-gray-400">Error: <code class="font-mono text-[11px]">401</code>, <code class="font-mono text-[11px]">500</code>.</p>
          </div>

          <!-- district-search -->
          <div class="space-y-3">
            <h3 class="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <span class="rounded px-1.5 py-0.5 text-[11px] font-bold" :class="methodClass.GET">GET</span>
              <code class="font-mono text-xs text-primary-600">/district-search</code>
            </h3>
            <p class="text-sm text-gray-600">Cari kecamatan berdasarkan nama, maksimum 20 hasil.</p>
            <div class="overflow-hidden rounded-xl border border-gray-200">
              <table class="w-full text-sm">
                <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr><th class="px-4 py-2.5 text-left font-medium">Param</th><th class="px-4 py-2.5 text-left font-medium">Tipe</th><th class="px-4 py-2.5 text-left font-medium">Wajib</th><th class="px-4 py-2.5 text-left font-medium">Keterangan</th></tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="p in districtSearchParams" :key="p.name">
                    <td class="px-4 py-2.5"><code class="font-mono text-xs text-primary-600">{{ p.name }}</code></td>
                    <td class="px-4 py-2.5 text-gray-500">{{ p.type }}</td>
                    <td class="px-4 py-2.5">{{ p.req }}</td>
                    <td class="px-4 py-2.5 text-gray-600">{{ p.desc }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="group relative">
              <pre class="overflow-x-auto rounded-xl bg-gray-900 px-4 py-3.5 text-[13px] leading-relaxed text-gray-100"><code>{{ districtSearchRequestSnippet }}</code></pre>
              <button type="button" class="absolute right-2.5 top-2.5 rounded-md bg-white/10 p-1.5 text-gray-300 opacity-0 transition-opacity hover:bg-white/20 group-hover:opacity-100" @click="copyCode(districtSearchRequestSnippet, 'districtsearchreq')">
                <Check v-if="copiedKey === 'districtsearchreq'" class="h-3.5 w-3.5 text-green-400" />
                <Copy v-else class="h-3.5 w-3.5" />
              </button>
            </div>
            <div class="group relative">
              <pre class="overflow-x-auto rounded-xl bg-gray-900 px-4 py-3.5 text-[13px] leading-relaxed text-gray-100"><code>{{ districtSearchResponseSnippet }}</code></pre>
              <button type="button" class="absolute right-2.5 top-2.5 rounded-md bg-white/10 p-1.5 text-gray-300 opacity-0 transition-opacity hover:bg-white/20 group-hover:opacity-100" @click="copyCode(districtSearchResponseSnippet, 'districtsearchres')">
                <Check v-if="copiedKey === 'districtsearchres'" class="h-3.5 w-3.5 text-green-400" />
                <Copy v-else class="h-3.5 w-3.5" />
              </button>
            </div>
            <h4 class="text-xs font-semibold uppercase tracking-wide text-gray-500">Error 422</h4>
            <div class="overflow-hidden rounded-xl border border-gray-200">
              <table class="w-full text-sm">
                <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr><th class="px-4 py-2.5 text-left font-medium">Field</th><th class="px-4 py-2.5 text-left font-medium">Pesan</th></tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="e in districtSearchErrorFields" :key="e.field">
                    <td class="px-4 py-2.5"><code class="font-mono text-xs text-primary-600">{{ e.field }}</code></td>
                    <td class="px-4 py-2.5 text-gray-600">{{ e.msg }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- zipcodes -->
          <div class="space-y-3">
            <h3 class="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <span class="rounded px-1.5 py-0.5 text-[11px] font-bold" :class="methodClass.GET">GET</span>
              <code class="font-mono text-xs text-primary-600">/zipcodes</code>
            </h3>
            <p class="text-sm text-gray-600">Daftar kode pos untuk kombinasi provinsi/kota/kecamatan.</p>
            <div class="overflow-hidden rounded-xl border border-gray-200">
              <table class="w-full text-sm">
                <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr><th class="px-4 py-2.5 text-left font-medium">Param</th><th class="px-4 py-2.5 text-left font-medium">Tipe</th><th class="px-4 py-2.5 text-left font-medium">Wajib</th><th class="px-4 py-2.5 text-left font-medium">Keterangan</th></tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="p in zipcodeParams" :key="p.name">
                    <td class="px-4 py-2.5"><code class="font-mono text-xs text-primary-600">{{ p.name }}</code></td>
                    <td class="px-4 py-2.5 text-gray-500">{{ p.type }}</td>
                    <td class="px-4 py-2.5">{{ p.req }}</td>
                    <td class="px-4 py-2.5 text-gray-600">{{ p.desc }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="group relative">
              <pre class="overflow-x-auto rounded-xl bg-gray-900 px-4 py-3.5 text-[13px] leading-relaxed text-gray-100"><code>{{ zipcodesRequestSnippet }}</code></pre>
              <button type="button" class="absolute right-2.5 top-2.5 rounded-md bg-white/10 p-1.5 text-gray-300 opacity-0 transition-opacity hover:bg-white/20 group-hover:opacity-100" @click="copyCode(zipcodesRequestSnippet, 'zipcodesreq')">
                <Check v-if="copiedKey === 'zipcodesreq'" class="h-3.5 w-3.5 text-green-400" />
                <Copy v-else class="h-3.5 w-3.5" />
              </button>
            </div>
            <div class="group relative">
              <pre class="overflow-x-auto rounded-xl bg-gray-900 px-4 py-3.5 text-[13px] leading-relaxed text-gray-100"><code>{{ zipcodesResponseSnippet }}</code></pre>
              <button type="button" class="absolute right-2.5 top-2.5 rounded-md bg-white/10 p-1.5 text-gray-300 opacity-0 transition-opacity hover:bg-white/20 group-hover:opacity-100" @click="copyCode(zipcodesResponseSnippet, 'zipcodesres')">
                <Check v-if="copiedKey === 'zipcodesres'" class="h-3.5 w-3.5 text-green-400" />
                <Copy v-else class="h-3.5 w-3.5" />
              </button>
            </div>
            <h4 class="text-xs font-semibold uppercase tracking-wide text-gray-500">Error 422 (satu per field yang hilang)</h4>
            <div class="overflow-hidden rounded-xl border border-gray-200">
              <table class="w-full text-sm">
                <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr><th class="px-4 py-2.5 text-left font-medium">Field</th><th class="px-4 py-2.5 text-left font-medium">Pesan</th></tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="e in zipcodeErrorFields" :key="e.field">
                    <td class="px-4 py-2.5"><code class="font-mono text-xs text-primary-600">{{ e.field }}</code></td>
                    <td class="px-4 py-2.5 text-gray-600">{{ e.msg }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <!-- Katalog Produk Penjualan -->
        <section id="sales-catalog" class="scroll-mt-6 space-y-4">
          <h2 class="text-lg font-bold text-gray-900">Katalog Produk Penjualan</h2>
          <p class="text-sm leading-relaxed text-gray-600">
            <span class="rounded px-1.5 py-0.5 text-[11px] font-bold" :class="methodClass.GET">GET</span>
            <code class="font-mono text-xs text-primary-600">/sales-products</code> — katalog produk siap jual lengkap dengan harga per kategori pelanggan dan stok gudang.
          </p>
          <div class="overflow-hidden rounded-xl border border-gray-200">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr><th class="px-4 py-2.5 text-left font-medium">Param</th><th class="px-4 py-2.5 text-left font-medium">Tipe</th><th class="px-4 py-2.5 text-left font-medium">Default</th><th class="px-4 py-2.5 text-left font-medium">Keterangan</th></tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="p in salesProductsParams" :key="p.name">
                  <td class="px-4 py-2.5"><code class="font-mono text-xs text-primary-600">{{ p.name }}</code></td>
                  <td class="px-4 py-2.5 text-gray-500">{{ p.type }}</td>
                  <td class="px-4 py-2.5 text-gray-500">{{ p.def }}</td>
                  <td class="px-4 py-2.5 text-gray-600">{{ p.desc }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 class="pt-1 text-sm font-semibold text-gray-800">Field SalesProduct</h3>
          <div class="overflow-hidden rounded-xl border border-gray-200">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr><th class="px-4 py-2.5 text-left font-medium">Field</th><th class="px-4 py-2.5 text-left font-medium">Tipe</th><th class="px-4 py-2.5 text-left font-medium">Keterangan</th></tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="f in salesProductFields" :key="f.name">
                  <td class="px-4 py-2.5"><code class="font-mono text-xs text-primary-600">{{ f.name }}</code></td>
                  <td class="px-4 py-2.5 text-gray-500">{{ f.type }}</td>
                  <td class="px-4 py-2.5 text-gray-600">{{ f.desc }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 class="pt-1 text-sm font-semibold text-gray-800">Field SalesProductSku (skus[])</h3>
          <div class="overflow-hidden rounded-xl border border-gray-200">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr><th class="px-4 py-2.5 text-left font-medium">Field</th><th class="px-4 py-2.5 text-left font-medium">Tipe</th><th class="px-4 py-2.5 text-left font-medium">Keterangan</th></tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="f in salesProductSkuFields" :key="f.name">
                  <td class="px-4 py-2.5"><code class="font-mono text-xs text-primary-600">{{ f.name }}</code></td>
                  <td class="px-4 py-2.5 text-gray-500">{{ f.type }}</td>
                  <td class="px-4 py-2.5 text-gray-600">{{ f.desc }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 class="pt-1 text-sm font-semibold text-gray-800">Contoh Respons</h3>
          <div class="group relative">
            <pre class="overflow-x-auto rounded-xl bg-gray-900 px-4 py-3.5 text-[13px] leading-relaxed text-gray-100"><code>{{ salesProductsResponseSnippet }}</code></pre>
            <button type="button" class="absolute right-2.5 top-2.5 rounded-md bg-white/10 p-1.5 text-gray-300 opacity-0 transition-opacity hover:bg-white/20 group-hover:opacity-100" @click="copyCode(salesProductsResponseSnippet, 'salesproductsres')">
              <Check v-if="copiedKey === 'salesproductsres'" class="h-3.5 w-3.5 text-green-400" />
              <Copy v-else class="h-3.5 w-3.5" />
            </button>
          </div>
          <p class="text-xs text-gray-400">Error: <code class="font-mono text-[11px]">404</code> bila gudang utama tidak ditemukan (atau <code class="font-mono text-[11px]">warehouse_id</code> tidak valid); <code class="font-mono text-[11px]">401</code>, <code class="font-mono text-[11px]">500</code>.</p>
        </section>

        <!-- Perhitungan Ongkir -->
        <section id="shipping-rates" class="scroll-mt-6 space-y-4">
          <h2 class="text-lg font-bold text-gray-900">Perhitungan Ongkir</h2>
          <p class="text-sm leading-relaxed text-gray-600">
            <span class="rounded px-1.5 py-0.5 text-[11px] font-bold" :class="methodClass.POST">POST</span>
            <code class="font-mono text-xs text-primary-600">/shipping-rates</code> — titik asal <strong>selalu</strong> gudang utama business (bukan input pengguna, demi isolasi antar tenant).
          </p>
          <div class="overflow-hidden rounded-xl border border-gray-200">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr><th class="px-4 py-2.5 text-left font-medium">Field Body</th><th class="px-4 py-2.5 text-left font-medium">Tipe</th><th class="px-4 py-2.5 text-left font-medium">Wajib</th><th class="px-4 py-2.5 text-left font-medium">Keterangan</th></tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="f in shippingRatesBodyFields" :key="f.name">
                  <td class="px-4 py-2.5"><code class="font-mono text-xs text-primary-600">{{ f.name }}</code></td>
                  <td class="px-4 py-2.5 text-gray-500">{{ f.type }}</td>
                  <td class="px-4 py-2.5">{{ f.req }}</td>
                  <td class="px-4 py-2.5 text-gray-600">{{ f.desc }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="group relative">
            <pre class="overflow-x-auto rounded-xl bg-gray-900 px-4 py-3.5 text-[13px] leading-relaxed text-gray-100"><code>{{ shippingRatesBodySnippet }}</code></pre>
            <button type="button" class="absolute right-2.5 top-2.5 rounded-md bg-white/10 p-1.5 text-gray-300 opacity-0 transition-opacity hover:bg-white/20 group-hover:opacity-100" @click="copyCode(shippingRatesBodySnippet, 'shippingratesbody')">
              <Check v-if="copiedKey === 'shippingratesbody'" class="h-3.5 w-3.5 text-green-400" />
              <Copy v-else class="h-3.5 w-3.5" />
            </button>
          </div>

          <h3 class="pt-1 text-sm font-semibold text-gray-800">Response 200 — data (OngkirIndex)</h3>
          <div class="overflow-hidden rounded-xl border border-gray-200">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr><th class="px-4 py-2.5 text-left font-medium">Group</th><th class="px-4 py-2.5 text-left font-medium">Tipe</th><th class="px-4 py-2.5 text-left font-medium">Keterangan</th></tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="g in shippingRatesGroups" :key="g.name">
                  <td class="px-4 py-2.5"><code class="font-mono text-xs text-primary-600">{{ g.name }}</code></td>
                  <td class="px-4 py-2.5 text-gray-500">{{ g.type }}</td>
                  <td class="px-4 py-2.5 text-gray-600">{{ g.desc }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <h4 class="text-xs font-semibold uppercase tracking-wide text-gray-500">Field Ongkir (tiap item dalam group)</h4>
          <div class="overflow-hidden rounded-xl border border-gray-200">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr><th class="px-4 py-2.5 text-left font-medium">Field</th><th class="px-4 py-2.5 text-left font-medium">Tipe</th><th class="px-4 py-2.5 text-left font-medium">Keterangan</th></tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="f in shippingRatesItemFields" :key="f.name">
                  <td class="px-4 py-2.5"><code class="font-mono text-xs text-primary-600">{{ f.name }}</code></td>
                  <td class="px-4 py-2.5 text-gray-500">{{ f.type }}</td>
                  <td class="px-4 py-2.5 text-gray-600">{{ f.desc }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="group relative">
            <pre class="overflow-x-auto rounded-xl bg-gray-900 px-4 py-3.5 text-[13px] leading-relaxed text-gray-100"><code>{{ shippingRatesResponseSnippet }}</code></pre>
            <button type="button" class="absolute right-2.5 top-2.5 rounded-md bg-white/10 p-1.5 text-gray-300 opacity-0 transition-opacity hover:bg-white/20 group-hover:opacity-100" @click="copyCode(shippingRatesResponseSnippet, 'shippingratesres')">
              <Check v-if="copiedKey === 'shippingratesres'" class="h-3.5 w-3.5 text-green-400" />
              <Copy v-else class="h-3.5 w-3.5" />
            </button>
          </div>

          <h3 class="pt-1 text-sm font-semibold text-gray-800">Error 422</h3>
          <div class="group relative">
            <pre class="overflow-x-auto rounded-xl bg-gray-900 px-4 py-3.5 text-[13px] leading-relaxed text-gray-100"><code>{{ shippingRatesErrorSnippet }}</code></pre>
            <button type="button" class="absolute right-2.5 top-2.5 rounded-md bg-white/10 p-1.5 text-gray-300 opacity-0 transition-opacity hover:bg-white/20 group-hover:opacity-100" @click="copyCode(shippingRatesErrorSnippet, 'shippingrateserr')">
              <Check v-if="copiedKey === 'shippingrateserr'" class="h-3.5 w-3.5 text-green-400" />
              <Copy v-else class="h-3.5 w-3.5" />
            </button>
          </div>
        </section>

        <!-- Customer & Address (Write) -->
        <section id="customer-write" class="scroll-mt-6 space-y-6">
          <h2 class="text-lg font-bold text-gray-900">Customer &amp; Alamat (Create)</h2>

          <!-- D.1 customers/create -->
          <div class="space-y-3">
            <h3 class="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <span class="rounded px-1.5 py-0.5 text-[11px] font-bold" :class="methodClass.POST">POST</span>
              <code class="font-mono text-xs text-primary-600">/customers/create</code>
            </h3>
            <p class="text-sm text-gray-600">
              Membuat pelanggan baru <strong>beserta satu alamat primary</strong> dalam satu panggilan. <code class="font-mono text-xs">country</code> otomatis diisi <code class="font-mono text-xs">"Indonesia"</code>;
              <code class="font-mono text-xs">store_id</code> dan kategori (default <code class="font-mono text-xs">"Regular"</code>) otomatis ditentukan dari business.
            </p>
            <div class="overflow-hidden rounded-xl border border-gray-200">
              <table class="w-full text-sm">
                <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr><th class="px-4 py-2.5 text-left font-medium">Field Body</th><th class="px-4 py-2.5 text-left font-medium">Wajib</th><th class="px-4 py-2.5 text-left font-medium">Keterangan</th></tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="f in customerCreateBodyFields" :key="f.name">
                    <td class="px-4 py-2.5"><code class="font-mono text-xs text-primary-600">{{ f.name }}</code></td>
                    <td class="px-4 py-2.5">{{ f.req }}</td>
                    <td class="px-4 py-2.5 text-gray-600">{{ f.desc }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="group relative">
              <pre class="overflow-x-auto rounded-xl bg-gray-900 px-4 py-3.5 text-[13px] leading-relaxed text-gray-100"><code>{{ customerCreateBodySnippet }}</code></pre>
              <button type="button" class="absolute right-2.5 top-2.5 rounded-md bg-white/10 p-1.5 text-gray-300 opacity-0 transition-opacity hover:bg-white/20 group-hover:opacity-100" @click="copyCode(customerCreateBodySnippet, 'customercreatebody')">
                <Check v-if="copiedKey === 'customercreatebody'" class="h-3.5 w-3.5 text-green-400" />
                <Copy v-else class="h-3.5 w-3.5" />
              </button>
            </div>

            <h4 class="text-xs font-semibold uppercase tracking-wide text-gray-500">Response 200 — data (MyCustomer)</h4>
            <div class="overflow-hidden rounded-xl border border-gray-200">
              <table class="w-full text-sm">
                <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr><th class="px-4 py-2.5 text-left font-medium">Field</th><th class="px-4 py-2.5 text-left font-medium">Keterangan</th></tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="f in customerCreateResponseFields" :key="f.name">
                    <td class="px-4 py-2.5"><code class="font-mono text-xs text-primary-600">{{ f.name }}</code></td>
                    <td class="px-4 py-2.5 text-gray-600">{{ f.desc }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="group relative">
              <pre class="overflow-x-auto rounded-xl bg-gray-900 px-4 py-3.5 text-[13px] leading-relaxed text-gray-100"><code>{{ customerCreateResponseSnippet }}</code></pre>
              <button type="button" class="absolute right-2.5 top-2.5 rounded-md bg-white/10 p-1.5 text-gray-300 opacity-0 transition-opacity hover:bg-white/20 group-hover:opacity-100" @click="copyCode(customerCreateResponseSnippet, 'customercreateres')">
                <Check v-if="copiedKey === 'customercreateres'" class="h-3.5 w-3.5 text-green-400" />
                <Copy v-else class="h-3.5 w-3.5" />
              </button>
            </div>

            <h4 class="text-xs font-semibold uppercase tracking-wide text-gray-500">Error 422 (errors per field)</h4>
            <div class="overflow-hidden rounded-xl border border-gray-200">
              <table class="w-full text-sm">
                <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr><th class="px-4 py-2.5 text-left font-medium">Field</th><th class="px-4 py-2.5 text-left font-medium">Pesan</th></tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="e in customerCreateErrorFields" :key="e.field">
                    <td class="px-4 py-2.5"><code class="font-mono text-xs text-primary-600">{{ e.field }}</code></td>
                    <td class="px-4 py-2.5 text-gray-600">{{ e.msg }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="text-xs text-gray-400">Error non-field (500): <code class="font-mono text-[11px]">{ "error": "gagal memeriksa toko internal" }</code>, <code class="font-mono text-[11px]">{ "error": "gagal memeriksa kategori pelanggan" }</code>.</p>
          </div>

          <!-- D.2 customers/:id -->
          <div class="space-y-3 border-t border-gray-100 pt-5">
            <h3 class="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <span class="rounded px-1.5 py-0.5 text-[11px] font-bold" :class="methodClass.PUT">PUT</span>
              <code class="font-mono text-xs text-primary-600">/customers/:id</code>
            </h3>
            <p class="text-sm text-gray-600">
              Memperbarui data dasar pelanggan (nama/telepon/email). <code class="font-mono text-xs">status</code> dipaksa <code class="font-mono text-xs">"active"</code>.
              Path param <code class="font-mono text-xs">id</code> — ID pelanggan.
            </p>
            <div class="overflow-hidden rounded-xl border border-gray-200">
              <table class="w-full text-sm">
                <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr><th class="px-4 py-2.5 text-left font-medium">Field Body</th><th class="px-4 py-2.5 text-left font-medium">Wajib</th><th class="px-4 py-2.5 text-left font-medium">Keterangan</th></tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="f in customerUpdateBodyFields" :key="f.name">
                    <td class="px-4 py-2.5"><code class="font-mono text-xs text-primary-600">{{ f.name }}</code></td>
                    <td class="px-4 py-2.5">{{ f.req }}</td>
                    <td class="px-4 py-2.5 text-gray-600">{{ f.desc }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="group relative">
              <pre class="overflow-x-auto rounded-xl bg-gray-900 px-4 py-3.5 text-[13px] leading-relaxed text-gray-100"><code>{{ customerUpdateBodySnippet }}</code></pre>
              <button type="button" class="absolute right-2.5 top-2.5 rounded-md bg-white/10 p-1.5 text-gray-300 opacity-0 transition-opacity hover:bg-white/20 group-hover:opacity-100" @click="copyCode(customerUpdateBodySnippet, 'customerupdatebody')">
                <Check v-if="copiedKey === 'customerupdatebody'" class="h-3.5 w-3.5 text-green-400" />
                <Copy v-else class="h-3.5 w-3.5" />
              </button>
            </div>
            <div class="group relative">
              <pre class="overflow-x-auto rounded-xl bg-gray-900 px-4 py-3.5 text-[13px] leading-relaxed text-gray-100"><code>{{ customerUpdateResponseSnippet }}</code></pre>
              <button type="button" class="absolute right-2.5 top-2.5 rounded-md bg-white/10 p-1.5 text-gray-300 opacity-0 transition-opacity hover:bg-white/20 group-hover:opacity-100" @click="copyCode(customerUpdateResponseSnippet, 'customerupdateres')">
                <Check v-if="copiedKey === 'customerupdateres'" class="h-3.5 w-3.5 text-green-400" />
                <Copy v-else class="h-3.5 w-3.5" />
              </button>
            </div>
            <h4 class="text-xs font-semibold uppercase tracking-wide text-gray-500">Error 422 (errors per field)</h4>
            <div class="overflow-hidden rounded-xl border border-gray-200">
              <table class="w-full text-sm">
                <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr><th class="px-4 py-2.5 text-left font-medium">Field</th><th class="px-4 py-2.5 text-left font-medium">Pesan</th></tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="e in customerUpdateErrorFields" :key="e.field">
                    <td class="px-4 py-2.5"><code class="font-mono text-xs text-primary-600">{{ e.field }}</code></td>
                    <td class="px-4 py-2.5 text-gray-600">{{ e.msg }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="text-xs text-gray-400">Error 500: <code class="font-mono text-[11px]">{ "error": "&lt;db error&gt;" }</code> bila update gagal.</p>
          </div>

          <!-- D.3 addresses/create -->
          <div class="space-y-3 border-t border-gray-100 pt-5">
            <h3 class="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <span class="rounded px-1.5 py-0.5 text-[11px] font-bold" :class="methodClass.POST">POST</span>
              <code class="font-mono text-xs text-primary-600">/addresses/create</code>
            </h3>
            <p class="text-sm text-gray-600">Menambah alamat baru untuk pelanggan yang sudah ada.</p>
            <div class="overflow-hidden rounded-xl border border-gray-200">
              <table class="w-full text-sm">
                <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr><th class="px-4 py-2.5 text-left font-medium">Field Body</th><th class="px-4 py-2.5 text-left font-medium">Wajib</th><th class="px-4 py-2.5 text-left font-medium">Keterangan</th></tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="f in addressBodyFields" :key="f.name">
                    <td class="px-4 py-2.5"><code class="font-mono text-xs text-primary-600">{{ f.name }}</code></td>
                    <td class="px-4 py-2.5">{{ f.req }}</td>
                    <td class="px-4 py-2.5 text-gray-600">{{ f.desc }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="group relative">
              <pre class="overflow-x-auto rounded-xl bg-gray-900 px-4 py-3.5 text-[13px] leading-relaxed text-gray-100"><code>{{ addressCreateBodySnippet }}</code></pre>
              <button type="button" class="absolute right-2.5 top-2.5 rounded-md bg-white/10 p-1.5 text-gray-300 opacity-0 transition-opacity hover:bg-white/20 group-hover:opacity-100" @click="copyCode(addressCreateBodySnippet, 'addresscreatebody')">
                <Check v-if="copiedKey === 'addresscreatebody'" class="h-3.5 w-3.5 text-green-400" />
                <Copy v-else class="h-3.5 w-3.5" />
              </button>
            </div>

            <h4 class="text-xs font-semibold uppercase tracking-wide text-gray-500">Response 200 — data (CustomerAddress)</h4>
            <div class="overflow-hidden rounded-xl border border-gray-200">
              <table class="w-full text-sm">
                <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr><th class="px-4 py-2.5 text-left font-medium">Field</th><th class="px-4 py-2.5 text-left font-medium">Tipe</th></tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="f in addressResponseFields" :key="f.name">
                    <td class="px-4 py-2.5"><code class="font-mono text-xs text-primary-600">{{ f.name }}</code></td>
                    <td class="px-4 py-2.5 text-gray-500">{{ f.type }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="group relative">
              <pre class="overflow-x-auto rounded-xl bg-gray-900 px-4 py-3.5 text-[13px] leading-relaxed text-gray-100"><code>{{ addressCreateResponseSnippet }}</code></pre>
              <button type="button" class="absolute right-2.5 top-2.5 rounded-md bg-white/10 p-1.5 text-gray-300 opacity-0 transition-opacity hover:bg-white/20 group-hover:opacity-100" @click="copyCode(addressCreateResponseSnippet, 'addresscreateres')">
                <Check v-if="copiedKey === 'addresscreateres'" class="h-3.5 w-3.5 text-green-400" />
                <Copy v-else class="h-3.5 w-3.5" />
              </button>
            </div>
            <h4 class="text-xs font-semibold uppercase tracking-wide text-gray-500">Error 422 (errors per field)</h4>
            <div class="overflow-hidden rounded-xl border border-gray-200">
              <table class="w-full text-sm">
                <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr><th class="px-4 py-2.5 text-left font-medium">Field</th><th class="px-4 py-2.5 text-left font-medium">Pesan</th></tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="e in addressCreateErrorFields" :key="e.field">
                    <td class="px-4 py-2.5"><code class="font-mono text-xs text-primary-600">{{ e.field }}</code></td>
                    <td class="px-4 py-2.5 text-gray-600">{{ e.msg }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="text-xs text-gray-400">Error non-field (422): <code class="font-mono text-[11px]">{ "error": "pelanggan tidak ditemukan" }</code>.</p>
          </div>

          <!-- D.4 addresses/:id -->
          <div class="space-y-3 border-t border-gray-100 pt-5">
            <h3 class="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <span class="rounded px-1.5 py-0.5 text-[11px] font-bold" :class="methodClass.PUT">PUT</span>
              <code class="font-mono text-xs text-primary-600">/addresses/:id</code>
            </h3>
            <p class="text-sm text-gray-600">
              Memperbarui alamat. Path param <code class="font-mono text-xs">id</code> — ID alamat. Body sama seperti
              <code class="font-mono text-xs">POST /addresses/create</code> (lihat tabel di atas); sertakan <code class="font-mono text-xs">customer_id</code> bila ingin mengatur ulang alamat primary.
              Response 200 mengembalikan <code class="font-mono text-xs">data</code> = CustomerAddress dengan pesan <code class="font-mono text-xs">"data successfully updated"</code>. Error 422 per field sama seperti pembuatan alamat.
            </p>
          </div>
        </section>

        <!-- Buat Order (Write) -->
        <section id="order-write" class="scroll-mt-6 space-y-4">
          <h2 class="text-lg font-bold text-gray-900">Buat Order (Create)</h2>
          <p class="text-sm leading-relaxed text-gray-600">
            <span class="rounded px-1.5 py-0.5 text-[11px] font-bold" :class="methodClass.POST">POST</span>
            <code class="font-mono text-xs text-primary-600">/orders/create</code> — membuat order penjualan. Perilaku otomatis:
          </p>
          <ul class="list-disc space-y-1 pl-5 text-sm text-gray-600">
            <li>Tag <code class="font-mono text-xs">"api"</code> ditambahkan di <strong>depan</strong> daftar <code class="font-mono text-xs">tags</code> (mis. kirim <code class="font-mono text-xs">["cmr","member"]</code> → tersimpan <code class="font-mono text-xs">["api","cmr","member"]</code>; tidak digandakan bila sudah ada).</li>
            <li>Order log dicatat dengan user kosong &amp; nama <code class="font-mono text-xs">"API"</code>.</li>
            <li><code class="font-mono text-xs">customer_id</code> diambil dari <code class="font-mono text-xs">address.customer_id</code>.</li>
            <li>Jika <code class="font-mono text-xs">payment_provider = "xendit"</code>, invoice Xendit dibuat otomatis.</li>
            <li>Webhook <code class="font-mono text-xs">order.created</code> dikirim.</li>
          </ul>

          <h3 class="pt-1 text-sm font-semibold text-gray-800">Field Body Utama</h3>
          <div class="overflow-hidden rounded-xl border border-gray-200">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr><th class="px-4 py-2.5 text-left font-medium">Field</th><th class="px-4 py-2.5 text-left font-medium">Wajib</th><th class="px-4 py-2.5 text-left font-medium">Keterangan</th></tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="f in orderCreateBodyFields" :key="f.name">
                  <td class="px-4 py-2.5"><code class="font-mono text-xs text-primary-600">{{ f.name }}</code></td>
                  <td class="px-4 py-2.5">{{ f.req }}</td>
                  <td class="px-4 py-2.5 text-gray-600">{{ f.desc }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h4 class="text-xs font-semibold uppercase tracking-wide text-gray-500">payment_method valid per provider</h4>
          <div class="overflow-hidden rounded-xl border border-gray-200">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr><th class="px-4 py-2.5 text-left font-medium">Provider</th><th class="px-4 py-2.5 text-left font-medium">Nilai valid</th></tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="p in paymentMethodProviderTable" :key="p.provider">
                  <td class="px-4 py-2.5"><code class="font-mono text-xs text-primary-600">{{ p.provider }}</code></td>
                  <td class="px-4 py-2.5 text-gray-600"><code class="font-mono text-[11px]">{{ p.values }}</code></td>
                </tr>
              </tbody>
            </table>
          </div>

          <h4 class="text-xs font-semibold uppercase tracking-wide text-gray-500">items[] (RequestOrderItem)</h4>
          <div class="overflow-hidden rounded-xl border border-gray-200">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr><th class="px-4 py-2.5 text-left font-medium">Field</th><th class="px-4 py-2.5 text-left font-medium">Wajib</th><th class="px-4 py-2.5 text-left font-medium">Keterangan</th></tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="f in orderItemFields" :key="f.name">
                  <td class="px-4 py-2.5"><code class="font-mono text-xs text-primary-600">{{ f.name }}</code></td>
                  <td class="px-4 py-2.5">{{ f.req }}</td>
                  <td class="px-4 py-2.5 text-gray-600">{{ f.desc }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h4 class="text-xs font-semibold uppercase tracking-wide text-gray-500">address (RequestAddress)</h4>
          <div class="overflow-hidden rounded-xl border border-gray-200">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr><th class="px-4 py-2.5 text-left font-medium">Field</th><th class="px-4 py-2.5 text-left font-medium">Wajib</th></tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="f in orderAddressFields" :key="f.name">
                  <td class="px-4 py-2.5"><code class="font-mono text-xs text-primary-600">{{ f.name }}</code></td>
                  <td class="px-4 py-2.5">{{ f.req }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h4 class="text-xs font-semibold uppercase tracking-wide text-gray-500">shipment (RequestShipment)</h4>
          <div class="overflow-hidden rounded-xl border border-gray-200">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr><th class="px-4 py-2.5 text-left font-medium">Field</th><th class="px-4 py-2.5 text-left font-medium">Wajib</th><th class="px-4 py-2.5 text-left font-medium">Keterangan</th></tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="f in orderShipmentFields" :key="f.name">
                  <td class="px-4 py-2.5"><code class="font-mono text-xs text-primary-600">{{ f.name }}</code></td>
                  <td class="px-4 py-2.5">{{ f.req }}</td>
                  <td class="px-4 py-2.5 text-gray-600">{{ f.desc }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 class="pt-1 text-sm font-semibold text-gray-800">Contoh Body</h3>
          <div class="group relative">
            <pre class="overflow-x-auto rounded-xl bg-gray-900 px-4 py-3.5 text-[13px] leading-relaxed text-gray-100"><code>{{ orderCreateBodySnippet }}</code></pre>
            <button type="button" class="absolute right-2.5 top-2.5 rounded-md bg-white/10 p-1.5 text-gray-300 opacity-0 transition-opacity hover:bg-white/20 group-hover:opacity-100" @click="copyCode(orderCreateBodySnippet, 'ordercreatebody')">
              <Check v-if="copiedKey === 'ordercreatebody'" class="h-3.5 w-3.5 text-green-400" />
              <Copy v-else class="h-3.5 w-3.5" />
            </button>
          </div>

          <h3 class="pt-1 text-sm font-semibold text-gray-800">Response 200 — data (ResponseOrderCreate)</h3>
          <div class="overflow-hidden rounded-xl border border-gray-200">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr><th class="px-4 py-2.5 text-left font-medium">Field</th><th class="px-4 py-2.5 text-left font-medium">Keterangan</th></tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="f in orderCreateResponseFields" :key="f.name">
                  <td class="px-4 py-2.5"><code class="font-mono text-xs text-primary-600">{{ f.name }}</code></td>
                  <td class="px-4 py-2.5 text-gray-600">{{ f.desc }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="text-xs text-gray-400">Objek <code class="font-mono text-[11px]">xendit</code> (OrderXendit): id, business_id, order_id, external_id, date_created, date_expired, date_canceled, amount (number), method, bank_name, account_name, account_number, qris, url, type, status, errors, created_at, updated_at.</p>
          <div class="group relative">
            <pre class="overflow-x-auto rounded-xl bg-gray-900 px-4 py-3.5 text-[13px] leading-relaxed text-gray-100"><code>{{ orderCreateResponseSnippet }}</code></pre>
            <button type="button" class="absolute right-2.5 top-2.5 rounded-md bg-white/10 p-1.5 text-gray-300 opacity-0 transition-opacity hover:bg-white/20 group-hover:opacity-100" @click="copyCode(orderCreateResponseSnippet, 'ordercreateres')">
              <Check v-if="copiedKey === 'ordercreateres'" class="h-3.5 w-3.5 text-green-400" />
              <Copy v-else class="h-3.5 w-3.5" />
            </button>
          </div>

          <h3 class="pt-1 text-sm font-semibold text-gray-800">Error 422 (errors per field)</h3>
          <div class="overflow-hidden rounded-xl border border-gray-200">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr><th class="px-4 py-2.5 text-left font-medium">Field</th><th class="px-4 py-2.5 text-left font-medium">Pesan</th></tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="e in orderCreateErrorFields" :key="e.field">
                  <td class="px-4 py-2.5"><code class="font-mono text-xs text-primary-600">{{ e.field }}</code></td>
                  <td class="px-4 py-2.5 text-gray-600">{{ e.msg }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="text-xs text-gray-400">Error non-field: <code class="font-mono text-[11px]">{ "error": "gagal membuat order" }</code> (500), atau error pembuatan invoice Xendit bila provider <code class="font-mono text-[11px]">xendit</code>.</p>
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
