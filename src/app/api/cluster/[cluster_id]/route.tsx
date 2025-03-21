import { NextResponse } from 'next/server';
import { firestore } from '@/firestore';

// GET /api/cluster/[cluster_id] => вернуть информацию о кластере
// (либо полные данные из Firestore, либо агрегированную аналитику)
export async function GET(
  request: Request,
  { params }: { params: { cluster_id: string } }
) {
  try {
    const { cluster_id: clusterId } = params;

    const clusterRef = firestore.collection('clusters').doc(clusterId);
    const snapshot = await clusterRef.get();
    if (!snapshot.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const data = snapshot.data();

    // При желании тут вы можете сделать ваш fetch
    // (например, getWalletStats) и вернуть агрегированную инфу

    return NextResponse.json({ clusterId, ...data });
  } catch (error) {
    console.error(`GET /cluster/${params.cluster_id} Error:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/cluster/[cluster_id] => обновить данные кластера
export async function PUT(
  request: Request,
  { params }: { params: { cluster_id: string } }
) {
  try {
    const { cluster_id: clusterId } = params;
    const { name, addresses } = await request.json();

    if (!name || !addresses) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const clusterRef = firestore.collection('clusters').doc(clusterId);
    const snapshot = await clusterRef.get();
    if (!snapshot.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await clusterRef.update({
      name,
      addresses,
    });

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error(`PUT /cluster/${params.cluster_id} Error:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/cluster/[cluster_id] => удалить кластер
// (Иногда полезно)
// export async function DELETE(
//   request: Request,
//   { params }: { params: { cluster_id: string } }
// ) {
//   try {
//     const { cluster_id: clusterId } = params;
//     const clusterRef = firestore.collection('clusters').doc(clusterId);

//     const snapshot = await clusterRef.get();
//     if (!snapshot.exists) {
//       return NextResponse.json({ error: 'Not found' }, { status: 404 });
//     }

//     await clusterRef.delete();
//     return NextResponse.json({ status: 'deleted' });
//   } catch (error) {
//     console.error(`DELETE /cluster/${params.cluster_id} Error:`, error);
//     return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
//   }
// }
