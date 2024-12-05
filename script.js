// DOM元素
const loginPage = document.getElementById('loginPage');
const mainPage = document.getElementById('mainPage');
const itemList = document.getElementById('itemList');
const adminPanel = document.getElementById('adminPanel');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const addItemForm = document.getElementById('addItemForm');
const adminItemList = document.getElementById('adminItemList');
const searchInput = document.getElementById('searchInput');
const searchSuggestions = document.getElementById('searchSuggestions');
const typeButtons = document.querySelectorAll('.type-btn');
const adminTabs = document.querySelectorAll('.tab-btn');
const showAllBtn = document.getElementById('showAll');
const showPendingBtn = document.getElementById('showPending');
const showShippedBtn = document.getElementById('showShipped');

let currentUserType = 'employee';
let currentFilter = 'all';

// 初始化 Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 检查数据库连接
db.enableNetwork().then(() => {
    console.log('Database connection established');
}).catch((error) => {
    console.error('Database connection failed:', error);
    alert('连接数据库失败，请检查网络连接');
});

// 初始数据
const initialItems = [
    {
        name: '电机A型号',
        status: '已发货',
        initialStock: 100,
        shipDate: '2024-03-20',
        shipQuantity: 20,
        remainingStock: 80,
        description: '已完成发货'
    },
    {
        name: '控制器B型号',
        status: '待发货',
        initialStock: 50,
        shipDate: '',
        shipQuantity: 0,
        remainingStock: 50,
        description: '正在准备中'
    }
];

// 初始化数据库
async function initializeData() {
    try {
        const snapshot = await db.collection('items').get();
        
        if (snapshot.empty) {
            console.log('Initializing database with default items...');
            const batch = db.batch();
            
            initialItems.forEach(item => {
                const docRef = db.collection('items').doc();
                batch.set(docRef, {
                    ...item,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
            
            await batch.commit();
            console.log('Database initialized successfully');
        }
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
}

// 加载商品列表
async function loadItems(retryCount = 3) {
    try {
        return db.collection('items')
            .orderBy('createdAt', 'desc')
            .onSnapshot((snapshot) => {
                const regularTable = document.querySelector('#itemList tbody');
                regularTable.innerHTML = '';
                
                const items = [];
                snapshot.forEach(doc => {
                    items.push({ id: doc.id, ...doc.data() });
                });

                const filteredItems = items.filter(item => {
                    if (currentFilter === 'pending') return item.status === '待发货';
                    if (currentFilter === 'shipped') return item.status === '已发货';
                    return true;
                });
                
                filteredItems.forEach(item => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${item.name}</td>
                        <td>${item.status}</td>
                        <td>${item.initialStock}</td>
                        <td>${item.status === '已发货' ? item.shipDate : '未发货'}</td>
                        <td>${item.shipQuantity}</td>
                        <td>${item.remainingStock}</td>
                        <td>${item.description}</td>
                    `;
                    regularTable.appendChild(row);
                });

                showAllBtn.classList.toggle('active', currentFilter === 'all');
                showPendingBtn.classList.toggle('active', currentFilter === 'pending');
                showShippedBtn.classList.toggle('active', currentFilter === 'shipped');
            }, (error) => {
                console.error('Error loading items:', error);
                if (retryCount > 0) {
                    console.log(`Retrying... (${retryCount} attempts left)`);
                    setTimeout(() => loadItems(retryCount - 1), 1000);
                } else {
                    alert('加载数据失败，请刷新页面重试');
                }
            });
    } catch (error) {
        console.error('Fatal error:', error);
        alert('系统错误，请联系管理员');
    }
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    initializeData();
});

// 登录类型切换
typeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        console.log('Button clicked:', btn.dataset.type); // 调试用
        typeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentUserType = btn.dataset.type;
        
        const hints = document.querySelectorAll('.show-hint');
        if (currentUserType === 'admin') {
            hints[0].textContent = '请输入管理员账号';
            hints[1].textContent = '请输入管理员密码';
        } else {
            hints[0].textContent = '请输入员工账号';
            hints[1].textContent = '请输入员工密码';
        }
        
        loginForm.reset();
    });
});

// 显示账号密码提示
document.querySelectorAll('.show-hint').forEach(btn => {
    btn.addEventListener('mousedown', () => {
        const input = btn.parentElement.querySelector('input');
        const isUsername = input.id === 'username';
        const isAdmin = currentUserType === 'admin';
        
        input.type = 'text';
        if (isAdmin) {
            input.value = isUsername ? '15091583011' : '123456';
        } else {
            input.value = '123';
        }
    });
    
    btn.addEventListener('mouseup', () => {
        const input = btn.parentElement.querySelector('input');
        if (input.id === 'password') {
            input.type = 'password';
        }
        input.value = '';
    });
});

// 页面切换函数
function switchPage(fromPage, toPage) {
    // 先将目标页面定位到右侧
    toPage.style.transform = 'translateX(100%)';
    toPage.classList.remove('hidden');
    
    // 强制浏览器重排
    void toPage.offsetWidth;
    
    // 当前页面向左移出
    fromPage.classList.remove('active');
    fromPage.classList.add('hidden');
    
    // 新页面从右侧滑入
    toPage.classList.add('active');
}

// 登录处理
loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    console.log('Form submitted'); // 调试用
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    console.log('Login attempt:', { currentUserType, username, password }); // 调试用
    
    const submitBtn = this.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = '登录中...';

    if (currentUserType === 'admin') {
        if (username === '15091583011' && password === '123456') {
            console.log('Admin login successful'); // 调试用
            switchPage(loginPage, mainPage);
            adminPanel.classList.remove('hidden');
            itemList.classList.add('hidden');
            initializeAdminPage();
        } else {
            alert('管理员账号或密码错误！');
        }
    } else {
        if (username === '123' && password === '123') {
            console.log('Employee login successful'); // 调试用
            switchPage(loginPage, mainPage);
            itemList.classList.remove('hidden');
            adminPanel.classList.add('hidden');
            loadItems();
        } else {
            alert('账号或密码错误！');
        }
    }

    submitBtn.disabled = false;
    submitBtn.textContent = '登录';
});

// 管理员面板标签页切换
adminTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        adminTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const tabName = tab.dataset.tab;
        if (tabName === 'itemList') {
            document.querySelector('.item-table').classList.remove('hidden');
            document.querySelector('#addItemForm').classList.add('hidden');
        } else {
            document.querySelector('.item-table').classList.add('hidden');
            document.querySelector('#addItemForm').classList.remove('hidden');
        }
    });
});

// 退出登录
logoutBtn.addEventListener('click', () => {
    switchPage(mainPage, loginPage);
    adminPanel.classList.add('hidden');
    itemList.classList.add('hidden');
    loginForm.reset();
});

// 初始化管理员页面
function initializeAdminPage() {
    return db.collection('items')
        .orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
            adminItemList.innerHTML = '';
            
            const items = [];
            snapshot.forEach(doc => {
                items.push({ id: doc.id, ...doc.data() });
            });

            const filteredItems = items.filter(item => {
                if (currentFilter === 'pending') return item.status === '待发货';
                if (currentFilter === 'shipped') return item.status === '已发货';
                return true;
            });
            
            filteredItems.forEach((item) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.name}</td>
                    <td>${item.status}</td>
                    <td>${item.initialStock}</td>
                    <td>${item.status === '已发货' ? item.shipDate : '未发货'}</td>
                    <td>${item.shipQuantity}</td>
                    <td>${item.remainingStock}</td>
                    <td>${item.description}</td>
                    <td>
                        <button onclick="editItem(this, '${item.id}')">编辑</button>
                        <button onclick="deleteItem('${item.id}')">删除</button>
                    </td>
                `;
                adminItemList.appendChild(row);
            });
        });
}

// 排序按钮事件
showAllBtn.addEventListener('click', () => {
    currentFilter = 'all';
    loadItems();
    if (!adminPanel.classList.contains('hidden')) {
        initializeAdminPage();
    }
});

showPendingBtn.addEventListener('click', () => {
    currentFilter = 'pending';
    loadItems();
    if (!adminPanel.classList.contains('hidden')) {
        initializeAdminPage();
    }
});

showShippedBtn.addEventListener('click', () => {
    currentFilter = 'shipped';
    loadItems();
    if (!adminPanel.classList.contains('hidden')) {
        initializeAdminPage();
    }
});

// 添加新商品
addItemForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const initialStock = parseInt(document.getElementById('newItemStock').value);
    const shipQuantity = parseInt(document.getElementById('newShipQuantity').value) || 0;
    
    if (shipQuantity > initialStock) {
        alert('发货数量不能大于库存数量！');
        return;
    }

    const newItem = {
        name: document.getElementById('newItemName').value,
        status: document.getElementById('newItemStatus').value,
        initialStock: initialStock,
        shipDate: document.getElementById('newShipDate').value,
        shipQuantity: shipQuantity,
        remainingStock: initialStock - shipQuantity,
        description: document.getElementById('newDescription').value,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('items').add(newItem);
        addItemForm.reset();
        document.querySelector('[data-tab="itemList"]').click();
    } catch (error) {
        console.error('Error adding item:', error);
        alert('添加失败，请重试');
    }
});

// 删除商品
window.deleteItem = async function(id) {
    if (confirm('确定要删除这条记录吗？')) {
        try {
            await db.collection('items').doc(id).delete();
        } catch (error) {
            console.error('Error deleting item:', error);
            alert('删除失败，请重试');
        }
    }
};

// 编辑商品
window.editItem = function(button, id) {
    const row = button.closest('tr');
    const cells = row.cells;
    const currentName = cells[0].textContent;
    const currentStatus = cells[1].textContent;
    const currentStock = cells[2].textContent;
    const currentDate = cells[3].textContent;
    const currentShipQuantity = cells[4].textContent;
    const currentDesc = cells[6].textContent;

    cells[0].innerHTML = `<input type="text" value="${currentName}">`;
    cells[1].innerHTML = `
        <select>
            <option value="待发货" ${currentStatus === '待发货' ? 'selected' : ''}>待发货</option>
            <option value="已发货" ${currentStatus === '已发货' ? 'selected' : ''}>已发货</option>
        </select>
    `;
    cells[2].innerHTML = `<input type="number" value="${currentStock}" min="0">`;
    cells[3].innerHTML = `<input type="date" value="${currentDate !== '未发货' ? currentDate : ''}">`;
    cells[4].innerHTML = `<input type="number" value="${currentShipQuantity}" min="0">`;
    cells[6].innerHTML = `<input type="text" value="${currentDesc}">`;
    cells[7].innerHTML = `
        <button onclick="saveEdit(this, '${id}')">保存</button>
        <button onclick="cancelEdit()">取消</button>
    `;
};

// 保存编辑
window.saveEdit = async function(button, id) {
    const row = button.closest('tr');
    const cells = row.cells;

    const initialStock = parseInt(cells[2].querySelector('input').value);
    const shipQuantity = parseInt(cells[4].querySelector('input').value);

    if (shipQuantity > initialStock) {
        alert('发货数量不能于库存数量！');
        return;
    }

    const updatedItem = {
        name: cells[0].querySelector('input').value,
        status: cells[1].querySelector('select').value,
        initialStock: initialStock,
        shipDate: cells[3].querySelector('input').value,
        shipQuantity: shipQuantity,
        remainingStock: initialStock - shipQuantity,
        description: cells[6].querySelector('input').value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('items').doc(id).update(updatedItem);
    } catch (error) {
        console.error('Error updating item:', error);
        alert('更新失败，请重试');
    }
};

// 取消编辑
window.cancelEdit = function() {
    initializeAdminPage();
};

// 搜索功能
let searchTimeout;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const searchText = e.target.value.trim().toLowerCase();
    
    if (searchText === '') {
        searchSuggestions.classList.add('hidden');
        loadItems();
        return;
    }

    searchTimeout = setTimeout(() => {
        db.collection('items').get().then((snapshot) => {
            const items = [];
            snapshot.forEach(doc => {
                const item = doc.data();
                if (item.name.toLowerCase().includes(searchText)) {
                    items.push(item);
                }
            });

            searchSuggestions.innerHTML = '';
            items.forEach(item => {
                const div = document.createElement('div');
                div.className = 'suggestion-item';
                div.textContent = item.name;
                div.onclick = () => {
                    searchInput.value = item.name;
                    searchSuggestions.classList.add('hidden');
                    const regularTable = document.querySelector('#itemList tbody');
                    regularTable.innerHTML = '';
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${item.name}</td>
                        <td>${item.status}</td>
                        <td>${item.initialStock}</td>
                        <td>${item.status === '已发货' ? item.shipDate : '未发货'}</td>
                        <td>${item.shipQuantity}</td>
                        <td>${item.remainingStock}</td>
                        <td>${item.description}</td>
                    `;
                    regularTable.appendChild(row);
                };
                searchSuggestions.appendChild(div);
            });
            
            searchSuggestions.classList.remove('hidden');
        });
    }, 300);
});

// 点击页面其他地方时隐藏搜索建议
document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
        searchSuggestions.classList.add('hidden');
    }
});