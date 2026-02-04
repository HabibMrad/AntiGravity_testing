from typing import List, Optional
from fastapi import FastAPI, HTTPException, Request, Depends, status
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from sqlmodel import Field, Session, SQLModel, create_engine, select
from contextlib import asynccontextmanager

# --- Database Setup ---
class Todo(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    content: str
    is_completed: bool = Field(default=False)

sqlite_file_name = "database.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

# --- App Lifecycle ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(lifespan=lifespan, title="Premium Todo App")

# --- Static Files & Templates ---
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# --- Routes ---

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    """Serve the main frontend application."""
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/api/todos", response_model=List[Todo])
async def read_todos(session: Session = Depends(get_session)):
    """Fetch all todos."""
    todos = session.exec(select(Todo).order_by(Todo.id.desc())).all()
    return todos

@app.post("/api/todos", response_model=Todo, status_code=status.HTTP_201_CREATED)
async def create_todo(todo: Todo, session: Session = Depends(get_session)):
    """Create a new todo."""
    session.add(todo)
    session.commit()
    session.refresh(todo)
    return todo

@app.patch("/api/todos/{todo_id}", response_model=Todo)
async def update_todo(todo_id: int, todo_update: Todo, session: Session = Depends(get_session)):
    """Update a todo (e.g. toggle completion)."""
    db_todo = session.get(Todo, todo_id)
    if not db_todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    
    todo_data = todo_update.model_dump(exclude_unset=True)
    for key, value in todo_data.items():
        setattr(db_todo, key, value)
        
    session.add(db_todo)
    session.commit()
    session.refresh(db_todo)
    return db_todo

@app.delete("/api/todos/{todo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_todo(todo_id: int, session: Session = Depends(get_session)):
    """Delete a todo."""
    db_todo = session.get(Todo, todo_id)
    if not db_todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    session.delete(db_todo)
    session.commit()
