// ─── Firebase Project Configuration ──────────────────────────────────────────
//
// Steps to configure:
// 1. Go to https://console.firebase.google.com/ and create a project
// 2. In Project Settings → General → Your apps, add a Web app
// 3. Copy the firebaseConfig object values into the fields below
// 4. Enable Authentication:
//    - Console → Authentication → Sign-in method
//    - Enable "Google" and "Email/Password"
// 5. Enable Firestore:
//    - Console → Firestore Database → Create database
//    - Start in production mode, then apply the security rules below
// 6. Apply Firestore Security Rules (Console → Firestore → Rules):
//
//    rules_version = '2';
//    service cloud.firestore {
//      match /databases/{database}/documents {
//
//        // ── Listings ──────────────────────────────────────────────────────────
//        match /listings/{listingId} {
//          allow read: if true;
//          allow create: if request.auth != null
//                        && request.resource.data.uid == request.auth.uid;
//          allow update: if request.auth != null
//                        && resource.data.uid == request.auth.uid;
//          // sample listing fields: crafterName, profession, server, pstAvailability,
//          // sheetUrl, description, commissionPct, crafterLevel, active, createdAt
//          // Owner OR admin can delete
//          allow delete: if request.auth != null
//                        && (resource.data.uid == request.auth.uid
//                            || get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.isAdmin == true);
//        }
//
//        // ── Orders ────────────────────────────────────────────────────────────
//        match /orders/{orderId} {
//          allow create: if request.auth != null
//                        && request.resource.data.customerUid == request.auth.uid;
//          allow read: if request.auth != null
//                      && (resource.data.crafterUid == request.auth.uid
//                          || resource.data.customerUid == request.auth.uid);
//          allow update: if request.auth != null && (
//            // Customer can cancel their own pending order
//            (resource.data.customerUid == request.auth.uid
//             && resource.data.status == 'pending'
//             && request.resource.data.status == 'cancelled'
//             && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status','updatedAt']))
//            ||
//            // Crafter can move order to in_progress or done
//            (resource.data.crafterUid == request.auth.uid
//             && request.resource.data.status in ['in_progress','done']
//             && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status','updatedAt']))
//          );
//          // Customer or crafter can hard-delete any order (cleans up their list)
//          allow delete: if request.auth != null
//            && (resource.data.customerUid == request.auth.uid
//                || resource.data.crafterUid == request.auth.uid);
//        }
//
//        // ── Admins ────────────────────────────────────────────────────────────
//        // Each user can only read their own admin doc (for self-checking).
//        // Write is disabled — bootstrap the first admin via the Firebase console:
//        //   Collection: admins  |  Document ID: <your-uid>  |  field: isAdmin = true
//        match /admins/{uid} {
//          allow read: if request.auth != null && request.auth.uid == uid;
//          allow write: if false;
//        }
//      }
//    }
//
// ─────────────────────────────────────────────────────────────────────────────

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBLBftKwNteyYbKDGsDpTjlmCPnfhAlfA8",
  authDomain: "gorgon-crafting-tools.firebaseapp.com",
  projectId: "gorgon-crafting-tools",
  storageBucket: "gorgon-crafting-tools.firebasestorage.app",
  messagingSenderId: "964423974604",
  appId: "1:964423974604:web:d251c47f56d65b4d2c4c69"
};
