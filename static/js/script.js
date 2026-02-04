document.addEventListener('DOMContentLoaded', () => {
    const todoInput = document.getElementById('todo-input');
    const addBtn = document.getElementById('add-btn');
    const todoList = document.getElementById('todo-list');
    const emptyState = document.getElementById('empty-state');

    // Fetch todos on load
    fetchTodos();

    // Event Listeners
    addBtn.addEventListener('click', addTodo);
    todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTodo();
    });

    async function fetchTodos() {
        try {
            const response = await fetch('/api/todos');
            const todos = await response.json();
            renderTodos(todos);
        } catch (error) {
            console.error('Error fetching todos:', error);
        }
    }

    async function addTodo() {
        const content = todoInput.value.trim();
        if (!content) return;

        try {
            const response = await fetch('/api/todos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: content, is_completed: false })
            });

            if (response.ok) {
                todoInput.value = '';
                fetchTodos(); // Re-fetch to simpler ensure order and IDs
            }
        } catch (error) {
            console.error('Error adding todo:', error);
        }
    }

    async function toggleTodo(id, isCompleted) {
        try {
            const response = await fetch(`/api/todos/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_completed: !isCompleted })
            });

            if (response.ok) {
                fetchTodos();
            }
        } catch (error) {
            console.error('Error toggling todo:', error);
        }
    }

    async function deleteTodo(id) {
        try {
            const response = await fetch(`/api/todos/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                fetchTodos();
            }
        } catch (error) {
            console.error('Error deleting todo:', error);
        }
    }

    function renderTodos(todos) {
        todoList.innerHTML = '';

        if (todos.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');

            todos.forEach(todo => {
                const li = document.createElement('li');
                li.className = `todo-item ${todo.is_completed ? 'completed' : ''}`;

                li.innerHTML = `
                    <button class="checkbox-btn" onclick="window.toggleTodo(${todo.id}, ${todo.is_completed})">
                        <i class="ri-check-line"></i>
                    </button>
                    <span class="todo-content">${escapeHtml(todo.content)}</span>
                    <button class="delete-btn" onclick="window.deleteTodo(${todo.id})">
                        <i class="ri-delete-bin-line"></i>
                    </button>
                `;

                todoList.appendChild(li);
            });
        }
    }

    // XSS Protection helper
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }

    // Expose functions to window for onclick handlers (simpler than event delegation for this size)
    window.toggleTodo = toggleTodo;
    window.deleteTodo = deleteTodo;
});
